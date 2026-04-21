'use client'

import { useEffect, useState } from 'react'

type Doc = {
  id: string
  name: string
  type: string
  size: number
  created_at: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentList({ refreshKey }: { refreshKey: number }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    fetch('/api/documents')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load documents (${r.status})`)
        return r.json()
      })
      .then(setDocs)
      .catch(e => setError(e.message))
  }, [refreshKey])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' })
      setDocs(prev => prev.filter(d => d.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  if (error) {
    return <p className="text-xs text-red-400">{error}</p>
  }

  if (docs.length === 0) {
    return <p className="text-xs">No documents uploaded yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {docs.map(doc => (
        <li
          key={doc.id}
          className="flex items-start justify-between gap-2 rounded bg-zinc-900 px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-200" title={doc.name}>
              {doc.name}
            </p>
            <p className="text-xs text-zinc-500">
              {doc.type.toUpperCase()} · {formatSize(doc.size)}
            </p>
          </div>
          <button
            onClick={() => handleDelete(doc.id)}
            disabled={deleting === doc.id}
            aria-label={`Delete ${doc.name}`}
            className="mt-0.5 shrink-0 transition-colors hover:text-red-400 disabled:opacity-40"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
