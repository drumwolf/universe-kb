import { createHash } from 'crypto'

import { chunkText } from '@/lib/chunk'
import pool from '@/lib/db'
import { embedChunks } from '@/lib/embed'
import { parseFile } from '@/lib/parse'
import { storeDocument } from '@/lib/store'

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
}

const ALLOWED_EXTENSIONS: Record<string, string> = {
  '.pdf': 'pdf',
  '.txt': 'txt',
  '.md': 'md',
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const type = ALLOWED_TYPES[file.type] ?? ALLOWED_EXTENSIONS[ext]
  if (!type) {
    return Response.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const contentHash = createHash('sha256').update(buffer).digest('hex')

  const { rows } = await pool.query<{ name: string }>(
    'SELECT name FROM documents WHERE content_hash = $1',
    [contentHash],
  )
  if (rows.length > 0) {
    return Response.json(
      { error: `Already uploaded as "${rows[0].name}"` },
      { status: 409 },
    )
  }

  const text = await parseFile(buffer, file.type)
  const chunks = chunkText(text)

  if (chunks.length === 0) {
    return Response.json({ error: 'No content found in file' }, { status: 400 })
  }

  const embeddings = await embedChunks(chunks)
  await storeDocument(file.name, type, file.size, chunks, embeddings, contentHash)

  return Response.json({ success: true, chunks: chunks.length })
}
