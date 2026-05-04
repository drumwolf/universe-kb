const CHUNK_SIZE = 800
const CHUNK_OVERLAP = 150

export function chunkText(text: string): string[] {
  const cleaned = text
    .replace(/^--\s*\d+\s*of\s*\d+\s*--$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([^\n])\n([^\n])/g, '$1 $2')
    .trim()

  // Break into atomic pieces: paragraphs, subdivided by sentence if too long
  const pieces = cleaned
    .split(/\n\n+/)
    .flatMap(para => {
      const p = para.trim()
      return p.length > CHUNK_SIZE ? (p.match(/[^.!?]+[.!?]+\s*/g) ?? [p]) : [p]
    })
    .map(p => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let i = 0

  while (i < pieces.length) {
    let buf = ''
    let j = i

    while (j < pieces.length) {
      const sep = buf ? '\n\n' : ''
      if (buf.length + sep.length + pieces[j].length > CHUNK_SIZE && buf) break
      buf += sep + pieces[j]
      j++
    }
    if (!buf) { buf = pieces[j]; j++ } // single piece that exceeds CHUNK_SIZE

    chunks.push(buf)

    if (j >= pieces.length) break

    // Back up from j to include ~CHUNK_OVERLAP chars in the next chunk
    let overlapChars = 0
    let next = j
    while (next > i + 1 && overlapChars < CHUNK_OVERLAP) {
      next--
      overlapChars += pieces[next].length
    }
    i = Math.max(i + 1, next)
  }

  return chunks
}
