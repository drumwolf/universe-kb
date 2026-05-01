import ChatPanel from '@/app/components/ChatPanel'
import { ConversationProvider } from '@/app/context/conversation'
import Sidebar from '@/app/components/Sidebar'

export default function Home() {
  return (
    <ConversationProvider>
      <div className="flex h-screen">
        <Sidebar />

        {/* Right panel — chat */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <ChatPanel />
        </main>
      </div>
    </ConversationProvider>
  )
}
