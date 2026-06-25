import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, embed, generateText, stepCountIs, streamText, tool, UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { voyage } from 'voyage-ai-provider'
import pool from '@/lib/db'
import { z } from 'zod'

export const maxDuration = 30

const chatModel = anthropic('claude-sonnet-4-5')
const embeddingModel = voyage.textEmbeddingModel('voyage-3')

const TOP_K = 5

export async function POST(req: Request) {
  const { messages, conversationId, mode }: { messages: UIMessage[]; conversationId: string; mode: 'qa' | 'generate' } = await req.json()

  const lastUserMessage = messages.findLast(m => m.role === 'user')

  const citations: Array<{ name: string; content: string }> = []
  let capturedWriter: { write: (part: any) => void } | null = null

  const result = streamText({
    model: chatModel,
    system: {
      role: 'system',
      content: mode === 'generate'
        ? `You are a creative writing assistant for a fictional universe. You have three tools: listDocuments (to see what source material exists), getDocument (to read a specific document's full content by id), and searchLore (to find relevant lore). Use these tools to ground yourself in the established universe — its tone, style, existing characters, factions, and world rules. Then use your general knowledge and creative abilities to generate, speculate, or infer. When the documents do not contain a specific answer, commit to the most plausible response using general knowledge and what the documents establish about the character or world. Never say you cannot determine something because it is not in the documents — that is Q&A mode behavior. In generate mode, you always provide a specific, confident answer grounded in context and general knowledge. Do not narrate your tool usage — go directly to the response after using tools.`
        : `You are a lore assistant for a fictional universe. You have three tools: listDocuments (to see what source material exists), getDocument (to read a specific document's full content by id), and searchLore (to find specific information). Use listDocuments to survey available material. Use getDocument when you need to read a whole document rather than search for a specific fact. Use searchLore to answer specific questions. Only state facts that are explicitly present in your tool results. If the specific information requested is not directly in the tool results — even if related content is — say you could not find the answer in the documents. Never infer, speculate, or construct details that are not explicitly in the documents. Do not draw on general knowledge. Do not narrate your tool usage — go directly to the answer after using tools.`,
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    },
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    onFinish: async ({ text }) => {
      if (capturedWriter && citations.length > 0) {
        const seen = new Set<string>()
        const deduped = citations.filter(c => seen.has(c.name) ? false : (seen.add(c.name), true))
        capturedWriter.write({ type: 'data-citations', data: deduped })
      }
      if (!conversationId || !lastUserMessage) return
      const userText = lastUserMessage.parts.find(p => p.type === 'text')?.text ?? ''

      const { rows: countRows } = await pool.query(
        'SELECT COUNT(*) AS count FROM messages WHERE conversation_id = $1',
        [conversationId],
      )
      const isFirst = parseInt(countRows[0].count) === 0

      await pool.query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, 'user', userText],
      )
      await pool.query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, 'assistant', text],
      )

      if (isFirst && userText) {
        const { text: title } = await generateText({
          model: anthropic('claude-haiku-4-5-20251001'),
          prompt: `Generate a short 4-6 word title for a conversation that starts with this message. Reply with only the title, no quotes, no punctuation at the end:\n\n${userText}`,
        })
        await pool.query(
          'UPDATE conversations SET title = $1 WHERE id = $2',
          [title.trim(), conversationId],
        )
      }
    },
    tools: {
      listDocuments: tool({
        description: 'List all documents in the knowledge base. Use this to see what source material is available before searching.',
        inputSchema: z.object({}),
        execute: async () => {
          const { rows } = await pool.query<{ id: string; name: string; type: string }>(
            'SELECT id, name, type FROM documents ORDER BY name',
          )
          if (rows.length === 0) return 'No documents in the knowledge base.'
          return rows.map(r => `[id:${r.id}] ${r.name} (${r.type})`).join('\n')
        },
      }),
      getDocument: tool({
        description: 'Read the full content of a specific document by its id. Use listDocuments first to get the id.',
        inputSchema: z.object({
          id: z.string().describe('The document id from listDocuments'),
        }),
        execute: async ({ id }) => {
          const { rows } = await pool.query<{ content: string; name: string }>(
            `SELECT c.content, d.name FROM chunks c
             JOIN documents d ON c.document_id = d.id
             WHERE c.document_id = $1 ORDER BY c.chunk_index`,
            [id],
          )
          if (rows.length === 0) return 'Document not found.'
          for (const r of rows) citations.push({ name: r.name, content: r.content })
          const full = rows.map(r => r.content).join('\n\n')
          const CHAR_LIMIT = 80000
          if (full.length > CHAR_LIMIT) {
            return full.slice(0, CHAR_LIMIT) + `\n\n[truncated — ${full.length - CHAR_LIMIT} characters omitted. The document continues beyond this point. Use searchLore with specific queries to find content in the remaining portion.]`
          }
          return full
        },
      }),
      searchLore: tool({
        description: 'Search the lore knowledge base for information relevant to the query.',
        inputSchema: z.object({
          query: z.string().describe('The search query to find relevant lore'),
        }),
        execute: async ({ query }) => {
          const { embedding } = await embed({
            model: embeddingModel,
            value: query,
          })

          const { rows } = await pool.query<{ content: string; name: string }>(
            `WITH vector_results AS (
               SELECT c.id, c.content, d.name,
                      ROW_NUMBER() OVER (ORDER BY c.embedding <=> $1::vector) AS rank
               FROM chunks c
               JOIN documents d ON c.document_id = d.id
               LIMIT $2
             ),
             keyword_results AS (
               SELECT c.id, c.content, d.name,
                      ROW_NUMBER() OVER (ORDER BY ts_rank(c.search_vector, query) DESC) AS rank
               FROM chunks c
               JOIN documents d ON c.document_id = d.id,
               plainto_tsquery('english', $3) query
               WHERE c.search_vector @@ query
               LIMIT $2
             ),
             rrf AS (
               SELECT id, content, name,
                      COALESCE(v.rank, 1000) AS v_rank,
                      COALESCE(k.rank, 1000) AS k_rank
               FROM (SELECT * FROM vector_results UNION SELECT * FROM keyword_results) all_results
               LEFT JOIN vector_results v USING (id)
               LEFT JOIN keyword_results k USING (id)
             )
             SELECT DISTINCT ON (id) content, name,
                    (1.0 / (60 + v_rank) + 1.0 / (60 + k_rank)) AS rrf_score
             FROM rrf
             ORDER BY id, rrf_score DESC
             LIMIT $2`,
            [JSON.stringify(embedding), TOP_K, query],
          )

          if (rows.length === 0) return 'No relevant documents found.'

          for (const r of rows) citations.push({ name: r.name, content: r.content })

          return rows.map(r => `[${r.name}]\n${r.content}`).join('\n\n---\n\n')
        },
      }),
    },
  })

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      capturedWriter = writer
      writer.merge(result.toUIMessageStream())
    },
  })

  return createUIMessageStreamResponse({ stream })
}
