'use client'

import { create } from 'zustand'
import type { CreatorMemoryProfile, MemoryScores } from '@/lib/director/memory/types'
import { computeMemoryScores } from '@/lib/director/memory/memory-score'

type DirectorMemoryState = {
  creatorMemory: CreatorMemoryProfile | null
  memoryScore: MemoryScores | null
  memoryLoaded: boolean
  lastLearningRun: string | null
  loading: boolean
  error: string | null

  loadMemory: () => Promise<void>
  refreshScores: () => void
  runLearning: (projectId: string) => Promise<boolean>
  reset: () => void
}

const initialState = {
  creatorMemory: null as CreatorMemoryProfile | null,
  memoryScore: null as MemoryScores | null,
  memoryLoaded: false,
  lastLearningRun: null as string | null,
  loading: false,
  error: null as string | null,
}

export const useDirectorMemoryStore = create<DirectorMemoryState>((set, get) => ({
  ...initialState,

  loadMemory: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/director/memory')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || res.statusText)
      }
      const data = await res.json()
      set({
        creatorMemory: data.memory ?? null,
        memoryScore: data.scores ?? null,
        memoryLoaded: true,
        loading: false,
      })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load director memory',
      })
    }
  },

  refreshScores: () => {
    const memory = get().creatorMemory
    if (!memory) return
    set({ memoryScore: computeMemoryScores(memory) })
  },

  runLearning: async (projectId) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/director/memory/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Learning failed')
      set({
        creatorMemory: data.memory ?? get().creatorMemory,
        memoryScore: data.scores ?? get().memoryScore,
        lastLearningRun: data.lastLearningRun ?? new Date().toISOString(),
        memoryLoaded: true,
        loading: false,
      })
      return true
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Director memory learning failed',
      })
      return false
    }
  },

  reset: () => set({ ...initialState }),
}))
