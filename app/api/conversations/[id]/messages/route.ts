import pool from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const { rowCount } = await pool.query('SELECT 1 FROM conversations WHERE id = $1', [id])
  if (rowCount === 0) return Response.json({ error: 'Conversation not found' }, { status: 404 })

  const { rows } = await pool.query(
    'SELECT id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [id],
  )
  return Response.json(rows)
}

