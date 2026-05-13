'use client'

import { useEffect, useState } from 'react'
import ChatPanel from '@/app/components/ChatPanel'
import Sidebar from '@/app/components/Sidebar'

export default function Home() {
  const [convoRefreshKey, setConvoRefreshKey] = useState(0)
  const [activeConversationId, setActiveConversationId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    const stored = localStorage.getItem('conversationId')
    setActiveConversationId(stored ?? null)
  }, [])

  function selectConversation(id: string | null) {
    setActiveConversationId(id)
    if (id) localStorage.setItem('conversationId', id)
    else localStorage.removeItem('conversationId')
  }

  function onConversationCreated(id: string) {
    selectConversation(id)
    setConvoRefreshKey(k => k + 1)
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        convoRefreshKey={convoRefreshKey}
        activeConversationId={activeConversationId ?? null}
        onSelectConversation={selectConversation}
      />

      {/* Right panel — chat */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatPanel
          activeConversationId={activeConversationId}
          onConversationCreated={onConversationCreated}
          onConversationUpdated={() => setConvoRefreshKey(k => k + 1)}
        />
      </main>
    </div>
  )
}
