import { parseFile } from '@/lib/parse'
import { chunkText } from '@/lib/chunk'
import { embedChunks } from '@/lib/embed'
import { storeDocument } from '@/lib/store'

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  const type = ALLOWED_TYPES[file.type]
  if (!type) {
    return Response.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const text = await parseFile(buffer, file.type)
  const chunks = chunkText(text)

  if (chunks.length === 0) {
    return Response.json({ error: 'No content found in file' }, { status: 400 })
  }

  const embeddings = await embedChunks(chunks)
  await storeDocument(file.name, type, file.size, chunks, embeddings)

  return Response.json({ success: true, chunks: chunks.length })
}
