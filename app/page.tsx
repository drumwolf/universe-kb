import ChatPanel from '@/app/components/ChatPanel'
import Sidebar from '@/app/components/Sidebar'

export default function Home() {
  return (
    <div className="flex h-screen bg-stone-50 text-zinc-100">
      <Sidebar />

      {/* Right panel — chat */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatPanel />
      </main>
    </div>
  )
}
