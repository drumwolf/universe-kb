'use client'

import { useState } from 'react'
import ConversationList from './ConversationList'
import UploadForm from './UploadForm'
import DocumentList from './DocumentList'

export default function Sidebar({
  convoRefreshKey,
  activeConversationId,
  onSelectConversation,
}: {
  convoRefreshKey: number
  activeConversationId: string | null
  onSelectConversation: (id: string | null) => void
}) {
  const [docRefreshKey, setDocRefreshKey] = useState(0)

  return (
    <aside className="flex w-72 flex-col gap-6 border-r border-zinc-800 p-5">
      <h1 className="text-base font-semibold tracking-tight">universe-kb</h1>

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
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Chats
        </h2>
        <ConversationList
            refreshKey={convoRefreshKey}
            activeConversationId={activeConversationId}
            onSelectConversation={onSelectConversation}
          />
      </section>
    </aside>
  )
}
