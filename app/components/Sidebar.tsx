'use client'

import { useState } from 'react'
import ConversationList from './ConversationList'
import UploadForm from './UploadForm'
import DocumentList from './DocumentList'

export default function Sidebar({
  convoRefreshKey,
  activeConversationId,
  onSelectConversation,
  mode,
  onModeChange,
}: {
  convoRefreshKey: number
  activeConversationId: string | null
  onSelectConversation: (id: string | null) => void
  mode: 'qa' | 'generate'
  onModeChange: (mode: 'qa' | 'generate') => void
}) {
  const [docRefreshKey, setDocRefreshKey] = useState(0)

  return (
    <aside className="flex w-72 flex-col gap-6 border-r border-zinc-800 p-5">
      <h1 className="text-base font-semibold tracking-tight">universe-kb</h1>
      <p className="text-xs leading-relaxed text-zinc-400">
        A knowledge base for fictional universe lore. Upload documents and ask questions in natural language — answers are grounded strictly in what you&apos;ve uploaded.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Mode</h2>
        <div className="flex gap-1">
          {(['qa', 'generate'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m === 'qa' ? 'Q&A' : 'Generate'}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Upload Document
        </h2>
        <UploadForm onSuccess={() => setDocRefreshKey(k => k + 1)} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Documents
        </h2>
        <DocumentList refreshKey={docRefreshKey} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Chats
          </h2>
          <button
            className="cursor-pointer text-xs text-zinc-400 transition-colors hover:text-zinc-100"
            onClick={() => onSelectConversation(null)}
          >
            + New
          </button>
        </div>
        <ConversationList
          refreshKey={convoRefreshKey}
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
        />
      </section>
    </aside>
  )
}
