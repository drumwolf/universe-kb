'use client'

import { useEffect, useState } from 'react'
import { useConversation } from '@/app/context/conversation'

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
  const { activeId, setActiveId, listRefreshKey, refreshList } = useConversation()
  const [conversations, setConversations] = useState<Convo[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    fetch('/api/conversations', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load conversations (${r.status})`)
        return r.json()
      })
      .then(setConversations)
      .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [listRefreshKey])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (id === activeId) setActiveId(null)
      refreshList()
    } finally {
      setDeleting(null)
    }
  }

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
          onClick={() => setActiveId(convo.id)}
          className={`flex cursor-pointer items-start justify-between gap-2 rounded px-3 py-2 transition-colors ${
            convo.id === activeId ? 'bg-zinc-700' : 'bg-zinc-900 hover:bg-zinc-800'
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-200" title={convo.title || 'Untitled'}>
              {convo.title || 'Untitled'}
            </p>
            <p className="text-xs text-zinc-500">
              {formatDate(convo.created_at)}
            </p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); handleDelete(convo.id) }}
            disabled={deleting === convo.id}
            aria-label={`Delete ${convo.title || 'conversation'}`}
            className="mt-0.5 shrink-0 transition-colors hover:text-red-400 disabled:opacity-40"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
