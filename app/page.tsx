import Sidebar from '@/app/components/Sidebar'
import ChatPanel from '@/app/components/ChatPanel'

export default function Home() {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />

      {/* Right panel — chat */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatPanel />
      </main>
    </div>
  )
}
