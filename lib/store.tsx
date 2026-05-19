'use client'
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { CONTENT, CREW, ACTIVITY } from './dummy-data'
import type { ContentPiece, CrewMember, ActivityItem, ContentStatus } from './types'

interface Store {
  content: ContentPiece[]
  crew: CrewMember[]
  activity: ActivityItem[]
  updateContent: (id: string, patch: Partial<ContentPiece>) => void
  addContent: (item: ContentPiece) => void
  removeContent: (id: string) => void
  setStatus: (id: string, status: ContentStatus) => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentPiece[]>(CONTENT)
  const [crew] = useState<CrewMember[]>(CREW)
  const [activity, setActivity] = useState<ActivityItem[]>(ACTIVITY)

  const updateContent = useCallback((id: string, patch: Partial<ContentPiece>) => {
    setContent(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }, [])
  const addContent = useCallback((item: ContentPiece) => {
    setContent(prev => [item, ...prev])
    setActivity(prev => [{ id: 'na'+Date.now(), who: 'You', action: 'created', target: item.title, time: 'just now' }, ...prev])
  }, [])
  const removeContent = useCallback((id: string) => {
    setContent(prev => prev.filter(c => c.id !== id))
  }, [])
  const setStatus = useCallback((id: string, status: ContentStatus) => {
    setContent(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    const item = content.find(c => c.id === id)
    if (item) setActivity(prev => [{ id: 'na'+Date.now(), who: 'You', action: 'moved', target: `${item.title} to ${status}`, time: 'just now' }, ...prev].slice(0,30))
  }, [content])

  return (
    <StoreContext.Provider value={{ content, crew, activity, updateContent, addContent, removeContent, setStatus }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
