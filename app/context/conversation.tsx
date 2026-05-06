'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ConversationContextValue = {
  activeId: string | null
  setActiveId: (id: string | null) => void
  listRefreshKey: number
  refreshList: () => void
}

const ConversationContext = createContext<ConversationContextValue | null>(null)

const STORAGE_KEY = 'conversationId'

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveIdState] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)

  function setActiveId(id: string | null) {
    setActiveIdState(id)
    if (id === null) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, id)
  }

  return (
    <ConversationContext.Provider
      value={{
        activeId,
        setActiveId,
        listRefreshKey,
        refreshList: useCallback(() => setListRefreshKey(k => k + 1), []),
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversation() {
  const ctx = useContext(ConversationContext)
  if (!ctx) throw new Error('useConversation must be used within ConversationProvider')
  return ctx
}
