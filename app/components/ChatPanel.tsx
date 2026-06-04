'use client'

import { DefaultChatTransport, getToolName, isDataUIPart, isTextUIPart, isToolUIPart } from 'ai'
import { useEffect, useRef, useState } from 'react'

import ReactMarkdown from 'react-markdown'
import { useChat } from '@ai-sdk/react'

export default function ChatPanel({
  activeConversationId,
  onConversationCreated,
  onConversationUpdated,
  mode,
}: {
  activeConversationId: string | null | undefined
  onConversationCreated: (id: string) => void
  onConversationUpdated: () => void
  mode: 'qa' | 'generate'
}) {
  const { messages, sendMessage, status, setMessages, stop } = useChat({
    onFinish: () => onConversationUpdated(),
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages, conversationId: conversationId.current, mode: modeRef.current },
      }),
    }),
  })
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const conversationId = useRef<string | null>(null)
  const modeRef = useRef(mode)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { modeRef.current = mode }, [mode])

  useEffect(() => {
    if (activeConversationId === undefined) return

    stop()
    const controller = new AbortController()

    if (activeConversationId === null) {
      fetch('/api/conversations', { method: 'POST', signal: controller.signal })
        .then(r => r.json())
        .then(data => onConversationCreated(data.id))
        .catch(e => { if (e.name !== 'AbortError') console.error(e) })
    } else {
      conversationId.current = activeConversationId
      setMessages([])
      fetch(`/api/conversations/${activeConversationId}/messages`, { signal: controller.signal })
        .then(r => {
          if (r.status === 404) {
            fetch('/api/conversations', { method: 'POST' })
              .then(r => r.json())
              .then(data => onConversationCreated(data.id))
            return null
          }
          if (!r.ok) throw new Error(`Failed to load messages (${r.status})`)
          return r.json()
        })
        .then(rows => {
          if (!rows) return
          setMessages(rows.map((row: { id: string; role: string; content: string }) => ({
            id: row.id,
            role: row.role,
            parts: [{ type: 'text' as const, text: row.content }],
          })))
        })
        .catch(e => { if (e.name !== 'AbortError') console.error(e) })
    }

    return () => controller.abort()
  }, [activeConversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-[800px] mx-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-6 text-center">
              <div>
                <h2 className="text-lg font-semibold text-zinc-800">universe-kb</h2>
                <p className="mt-2 text-sm text-zinc-400 max-w-sm">
                  An agentic RAG app for fictional universe lore. Upload documents, then ask questions — Claude searches your knowledge base and answers strictly from what you&apos;ve uploaded.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {(mode === 'qa' ? [
                  'What documents have been uploaded?',
                  'Who are the main characters?',
                  'What are the major factions in this universe?',
                ] : [
                  'Create a new character consistent with the existing lore',
                  'Write a description for a new location in this universe',
                  'Generate a faction that fits the established world',
                ]).map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="rounded border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(message => (
            <div
              key={message.id}
              className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {message.parts.map((part, i) => {
                if (isToolUIPart(part)) {
                  const name = getToolName(part)
                  const done = part.state === 'output-available'
                  const label = name === 'searchLore'
                    ? `Searching lore${(part as any).input?.query ? ` for "${(part as any).input.query}"` : ''}…`
                    : name === 'getDocument'
                    ? 'Reading document…'
                    : 'Listing documents…'
                  return (
                    <div key={i} className="flex items-center gap-1.5 py-0.5 text-xs text-zinc-500 italic">
                      {!done && <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse" />}
                      {done ? '✓' : label}
                    </div>
                  )
                }
                if (isDataUIPart(part) && part.type === 'data-citations') {
                  const sources = part.data as Array<{ name: string; content: string }>
                  return (
                    <details key={i} className="mt-2 text-xs text-zinc-500">
                      <summary className="cursor-pointer select-none hover:text-zinc-300">
                        Sources ({sources.length})
                      </summary>
                      <div className="mt-1.5 space-y-2 border-l border-zinc-700 pl-3">
                        {sources.map((s, j) => (
                          <div key={j}>
                            <div className="font-medium text-zinc-400">{s.name}</div>
                            <div className="mt-0.5 line-clamp-2 text-zinc-500">{s.content}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                }

                if (isTextUIPart(part) && part.text) {
                  return (
                    <div
                      key={i}
                      className={`rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-zinc-700 text-zinc-100 font-mono max-w-[80%]'
                          : 'font-serif'
                      }`}
                    >
                      <div className={`prose prose-sm max-w-none ${
                        message.role === 'user' ? 'prose-invert text-md' : 'text-[16px]'
                      }`}>
                        <ReactMarkdown>{part.text}</ReactMarkdown>
                      </div>
                    </div>
                  )
                }
                return null
              })}
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
          placeholder={mode === 'qa' ? 'Ask about your documents…' : 'Describe what you’d like to create…'}
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
