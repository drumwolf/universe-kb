'use client'

import { DefaultChatTransport, isTextUIPart } from 'ai'
import { useEffect, useRef } from 'react'
import { useState } from 'react'

import ReactMarkdown from 'react-markdown'
import { useChat } from '@ai-sdk/react'
import { useConversation } from '@/app/context/conversation'

export default function ChatPanel() {
  const { activeId, setActiveId, refreshList } = useConversation()
  const conversationId = useRef<string | null>(null)

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages, conversationId: conversationId.current },
      }),
    }),
  })
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    if (activeId) {
      conversationId.current = activeId
      setMessages([])
      fetch(`/api/conversations/${activeId}/messages`, { signal: controller.signal })
        .then(r => {
          if (!r.ok) throw new Error(`Failed to load messages (${r.status})`)
          return r.json()
        })
        .then(rows => {
          setMessages(rows.map((row: { id: string; role: string; content: string }) => ({
            id: row.id,
            role: row.role,
            parts: [{ type: 'text' as const, text: row.content }],
          })))
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e) })
    } else {
      fetch('/api/conversations', { method: 'POST', signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          conversationId.current = data.id
          setActiveId(data.id)
          refreshList()
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e) })
    }

    return () => controller.abort()
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-[800px] mx-auto p-4 space-y-4">
          {messages.length === 0 && (
            <p className="mt-8 text-center text-sm">
              Upload a document, then ask a question.
            </p>
          )}

          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'bg-zinc-700 text-zinc-100 font-mono max-w-[80%]'
                    : 'font-serif'
                }`}
              >
                {message.parts.filter(isTextUIPart).map((part, i) => (
                  <div key={i} className={`prose prose-sm max-w-none ${
                    message.role === 'user' ? 'prose-invert text-md' : 'text-[16px]'
                  }`}>
                    <ReactMarkdown>{part.text}</ReactMarkdown>
                  </div>
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
      </div>

      {/* Input */}
      <form
        onSubmit={e => {
          e.preventDefault()
          if (!input.trim() || status !== 'ready') return
          sendMessage({ text: input })
          setInput('')
          if (textareaRef.current) textareaRef.current.style.height = 'auto'
        }}
        className="flex gap-2 border-t border-zinc-800 p-4"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value)
            const el = textareaRef.current
            if (el) {
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (!input.trim() || status !== 'ready') return
              sendMessage({ text: input })
              setInput('')
              if (textareaRef.current) textareaRef.current.style.height = 'auto'
            }
          }}
          disabled={status !== 'ready'}
          placeholder="Ask about your documents…"
          rows={1}
          className="flex-1 resize-none rounded bg-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!input.trim() || status !== 'ready'}
          className="cursor-pointer rounded bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}
