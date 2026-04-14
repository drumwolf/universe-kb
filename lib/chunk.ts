const MIN_CHUNK_LENGTH = 100

export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  // Merge short paragraphs into the next one so we don't embed fragments
  const chunks: string[] = []
  let buffer = ''

  for (const paragraph of paragraphs) {
    buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph
    if (buffer.length >= MIN_CHUNK_LENGTH) {
      chunks.push(buffer)
      buffer = ''
    }
  }

  if (buffer) {
    chunks.push(buffer)
  }

  return chunks
}
