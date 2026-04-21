import pool from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const { rows } = await pool.query(
    'SELECT id, role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [id],
  )
  return Response.json(rows)
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params
  const { role, content } = await req.json()
  const { rows } = await pool.query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at',
    [id, role, content],
  )
  return Response.json(rows[0], { status: 201 })
}
