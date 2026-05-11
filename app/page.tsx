'use client'

import { useState } from 'react'
import ChatPanel from '@/app/components/ChatPanel'
import Sidebar from '@/app/components/Sidebar'

export default function Home() {
  const [convoRefreshKey, setConvoRefreshKey] = useState(0)

  return (
    <div className="flex h-screen">
      <Sidebar convoRefreshKey={convoRefreshKey} />

      {/* Right panel — chat */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatPanel onNewConversation={() => setConvoRefreshKey(k => k + 1)} />
      </main>
    </div>
  )
}
