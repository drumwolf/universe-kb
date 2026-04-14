import { voyage } from 'voyage-ai-provider'
import { embedMany } from 'ai'

const model = voyage.textEmbeddingModel('voyage-3')

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model,
    values: chunks,
  })
  return embeddings
}
