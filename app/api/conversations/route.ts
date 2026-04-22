import pool from '@/lib/db'

export async function GET() {
  const { rows } = await pool.query(
    'SELECT id, title, created_at FROM conversations ORDER BY created_at DESC',
  )
  return Response.json(rows)
}

export async function POST() {
  const { rows } = await pool.query(
    'INSERT INTO conversations DEFAULT VALUES RETURNING id, title, created_at',
  )
  return Response.json(rows[0], { status: 201 })
}
