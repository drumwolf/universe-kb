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
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: chatModel,
    system: `You are a lore assistant for a fictional universe. Use the searchLore tool to find relevant information before answering. If the tool returns no results, say you could not find the answer in the documents. Do not draw on general knowledge.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
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
            `SELECT c.content, d.name
             FROM chunks c
             JOIN documents d ON c.document_id = d.id
             ORDER BY c.embedding <=> $1::vector
             LIMIT $2`,
            [JSON.stringify(embedding), TOP_K],
          )

          if (rows.length === 0) return 'No relevant documents found.'

          return rows.map(r => `[${r.name}]\n${r.content}`).join('\n\n---\n\n')
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
