'use client'

import { useState, useRef, SubmitEvent } from 'react'

type Status = 'idle' | 'uploading' | 'success' | 'error'

export default function UploadForm({ onSuccess }: { onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return

    setStatus('uploading')
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Upload failed')
      } else {
        setStatus('success')
        setMessage(`Indexed ${data.chunks} chunk${data.chunks === 1 ? '' : 's'}`)
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
        onSuccess?.()
      }
    } catch {
      setStatus('error')
      setMessage('Network error — is the server running?')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-zinc-400">File (.pdf, .txt, .md)</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={e => {
            setFile(e.target.files?.[0] ?? null)
            setStatus('idle')
            setMessage('')
          }}
          className="text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-zinc-700 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-200 file:cursor-pointer hover:file:bg-zinc-600"
        />
      </label>

      <button
        type="submit"
        disabled={!file || status === 'uploading'}
        className="rounded bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === 'uploading' ? 'Uploading…' : 'Upload'}
      </button>

      {message && (
        <p
          className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
        >
          {message}
        </p>
      )}
    </form>
  )
}
