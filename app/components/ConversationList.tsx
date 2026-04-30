'use client'

import { useEffect, useState } from 'react'

type Convo = {
  id: string
  created_at: string
  title: string
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatDate(dateStr: string): string {
  return dateFormatter.format(new Date(dateStr))
}

export default function ConversationList() {
  const [conversations, setConversations] = useState<Convo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/conversations', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load conversations (${r.status})`)
        return r.json()
      })
      .then(setConversations)
      .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [])

  if (error) {
    return <p className="text-xs text-red-400">{error}</p>
  }

  if (conversations.length === 0) {
    return <p className="text-xs">No conversations yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {conversations.map(convo => (
        <li
          key={convo.id}
          className="flex items-start justify-between gap-2 rounded bg-zinc-900 px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-200" title={convo.title || 'Untitled'}>
              {convo.title || 'Untitled'}
            </p>
            <p className="text-xs text-zinc-500">
              {formatDate(convo.created_at)}
            </p>
          </div>
          {/* <button
            onClick={() => handleDelete(doc.id)}
            disabled={deleting === doc.id}
            aria-label={`Delete ${convo.name}`}
            className="mt-0.5 shrink-0 transition-colors hover:text-red-400 disabled:opacity-40"
          >
            ×
          </button> */}
        </li>
      ))}
    </ul>
  )
}
