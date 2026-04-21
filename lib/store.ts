import pool from '@/lib/db'

export async function storeDocument(
  name: string,
  type: string,
  size: number,
  chunks: string[],
  embeddings: number[][],
  contentHash: string,
): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { rows } = await client.query<{ id: string }>(
      'INSERT INTO documents (name, type, size, content_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, type, size, contentHash],
    )
    const documentId = rows[0].id

    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        'INSERT INTO chunks (document_id, content, embedding, chunk_index) VALUES ($1, $2, $3, $4)',
        [documentId, chunks[i], JSON.stringify(embeddings[i]), i],
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
