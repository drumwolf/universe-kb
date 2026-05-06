'use client'

import ConversationList from './ConversationList'
import DocumentList from './DocumentList'
import UploadForm from './UploadForm'
import { useState } from 'react'

export default function Sidebar() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <aside className="flex w-72 flex-col gap-6 border-r border-zinc-800 p-5">
      <h1 className="text-base font-semibold tracking-tight">universe-kb</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Upload Document
        </h2>
        <UploadForm onSuccess={() => setRefreshKey(k => k + 1)} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Documents
        </h2>
        <DocumentList refreshKey={refreshKey} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Chats
        </h2>
        <ConversationList />
      </section>
    </aside>
  )
}
