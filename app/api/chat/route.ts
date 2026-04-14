import { convertToModelMessages, embed, isTextUIPart, streamText, UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { voyage } from 'voyage-ai-provider'
import pool from '@/lib/db'

export const maxDuration = 30

const chatModel = anthropic('claude-sonnet-4-5')
const embeddingModel = voyage.textEmbeddingModel('voyage-3')

const TOP_K = 5

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  // Extract text from the last user message for embedding
  const lastUser = messages.findLast(m => m.role === 'user')
  const queryText = lastUser?.parts
    .filter(isTextUIPart)
    .map(p => p.text)
    .join(' ') ?? ''

  // Embed the query
  const { embedding } = await embed({
    model: embeddingModel,
    value: queryText,
  })

  // Retrieve the most similar chunks
  const { rows } = await pool.query<{ content: string; name: string }>(
    `SELECT c.content, d.name
     FROM chunks c
     JOIN documents d ON c.document_id = d.id
     ORDER BY c.embedding <=> $1::vector
     LIMIT $2`,
    [JSON.stringify(embedding), TOP_K],
  )

  const context =
    rows.length > 0
      ? rows.map(r => `[${r.name}]\n${r.content}`).join('\n\n---\n\n')
      : 'No documents have been uploaded yet.'

  const system = `You are a lore assistant for a fictional universe. Answer questions strictly based on the context below. Do not draw on general knowledge. If the answer is not found in the context, say so clearly.

<context>
${context}
</context>`

  const result = streamText({
    model: chatModel,
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
