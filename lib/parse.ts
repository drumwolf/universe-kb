// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>

export async function parseFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer)
    return result.text
  }

  // .txt and .md are plain text
  return buffer.toString('utf-8')
}
