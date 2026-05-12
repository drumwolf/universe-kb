import pool from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { rowCount } = await pool.query('DELETE FROM conversations WHERE id = $1', [id])

  if (rowCount === 0) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
