'use client'

import { DefaultChatTransport, isTextUIPart } from 'ai'
import { useEffect, useRef, useState } from 'react'

import { useChat } from '@ai-sdk/react'

export default function ChatPanel() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-600">
            Upload a document, then ask a question.
          </p>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-zinc-800 text-zinc-200'
              }`}
            >
              {message.parts.filter(isTextUIPart).map((part, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  {part.text}
                </p>
              ))}
            </div>
          </div>
        ))}

        {status === 'submitted' && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-500">
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={e => {
          e.preventDefault()
          if (!input.trim() || status !== 'ready') return
          sendMessage({ text: input })
          setInput('')
        }}
        className="flex gap-2 border-t border-zinc-800 p-4"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={status !== 'ready'}
          placeholder="Ask about your documents…"
          className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!input.trim() || status !== 'ready'}
          className="rounded bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
