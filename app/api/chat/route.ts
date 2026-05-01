import { convertToModelMessages, embed, stepCountIs, streamText, tool, UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { voyage } from 'voyage-ai-provider'
import pool from '@/lib/db'
import { z } from 'zod'

export const maxDuration = 30

const chatModel = anthropic('claude-sonnet-4-5')
const embeddingModel = voyage.textEmbeddingModel('voyage-3')

const TOP_K = 5

export async function POST(req: Request) {
  const { messages, conversationId }: { messages: UIMessage[]; conversationId: string } = await req.json()

  const lastUserMessage = messages.findLast(m => m.role === 'user')

  const result = streamText({
    model: chatModel,
    system: `You are a lore assistant for a fictional universe. You have two tools: listDocuments (to see what source material exists) and searchLore (to find specific information). Use listDocuments when the user asks what documents are available, or when knowing the source material would help you search more effectively. Use searchLore to answer specific questions. If search returns no results, say you could not find the answer in the documents. Do not draw on general knowledge.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    onFinish: async ({ text }) => {
      if (!conversationId || !lastUserMessage) return
      const userText = lastUserMessage.parts.find(p => p.type === 'text')?.text ?? ''
      await pool.query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3), ($1, $4, $5)',
        [conversationId, 'user', userText, 'assistant', text],
      )
    },
    tools: {
      listDocuments: tool({
        description: 'List all documents in the knowledge base. Use this to see what source material is available before searching.',
        inputSchema: z.object({}),
        execute: async () => {
          const { rows } = await pool.query<{ id: number; name: string; type: string }>(
            'SELECT id, name, type FROM documents ORDER BY name',
          )
          if (rows.length === 0) return 'No documents in the knowledge base.'
          return rows.map(r => `[id:${r.id}] ${r.name} (${r.type})`).join('\n')
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

          return rows.map(r => `[${r.name}]\n${r.content}`).join('\n\n---\n\n')
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
