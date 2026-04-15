import UploadForm from '@/app/components/UploadForm'

export default function Home() {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Left panel — document management */}
      <aside className="flex w-72 flex-col gap-6 border-r border-zinc-800 p-5">
        <h1 className="text-base font-semibold tracking-tight">universe-kb</h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Upload Document
          </h2>
          <UploadForm />
        </section>

        {/* Document list — Step 8 */}
      </aside>

      {/* Right panel — chat */}
      <main className="flex flex-1 items-center justify-center text-zinc-600 text-sm">
        Chat coming in Step 7
      </main>
    </div>
  )
}
