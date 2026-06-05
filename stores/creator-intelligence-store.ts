'use client'

import { create } from 'zustand'
import type {
  CreatorIntelligenceGraphData,
  Insight,
} from '@/lib/intelligence/types'

type CreatorIntelligenceState = {
  intelligenceGraph: CreatorIntelligenceGraphData | null
  insights: Insight[]
  graphLoaded: boolean
  lastRebuild: string | null
  loading: boolean
  rebuilding: boolean
  error: string | null

  loadIntelligence: () => Promise<void>
  rebuildGraph: () => Promise<boolean>
  reset: () => void
}

const initialState = {
  intelligenceGraph: null as CreatorIntelligenceGraphData | null,
  insights: [] as Insight[],
  graphLoaded: false,
  lastRebuild: null as string | null,
  loading: false,
  rebuilding: false,
  error: null as string | null,
}

export const useCreatorIntelligenceStore = create<CreatorIntelligenceState>((set) => ({
  ...initialState,

  loadIntelligence: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/director/intelligence')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || res.statusText)
      }
      const data = await res.json()
      set({
        intelligenceGraph: data.graph ?? null,
        insights: data.insights ?? [],
        graphLoaded: true,
        lastRebuild: data.lastRebuild ?? null,
        loading: false,
      })
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load intelligence graph',
      })
    }
  },

  rebuildGraph: async () => {
    set({ rebuilding: true, error: null })
    try {
      const res = await fetch('/api/director/intelligence/rebuild', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rebuild failed')
      set({
        intelligenceGraph: data.graph ?? null,
        insights: data.insights ?? [],
        graphLoaded: true,
        lastRebuild: data.lastRebuild ?? new Date().toISOString(),
        rebuilding: false,
      })
      return true
    } catch (e) {
      set({
        rebuilding: false,
        error: e instanceof Error ? e.message : 'Intelligence graph rebuild failed',
      })
      return false
    }
  },

  reset: () => set({ ...initialState }),
}))
