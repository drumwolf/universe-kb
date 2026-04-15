import pool from '@/lib/db'

type DocumentRow = {
  id: string
  name: string
  type: string
  size: number
  created_at: string
}

export async function GET() {
  const { rows } = await pool.query<DocumentRow>(
    'SELECT id, name, type, size, created_at FROM documents ORDER BY created_at DESC',
  )
  return Response.json(rows)
}
