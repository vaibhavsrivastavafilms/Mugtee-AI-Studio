'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MemoryProfile } from '@/lib/memory/types'
import { emptyMemoryProfile } from '@/lib/memory/creator-memory-engine'

type CreatorMemoryStore = {
  profile: MemoryProfile
  hydrated: boolean
  loading: boolean
  companionMessage: { greeting: string; insight: string; badge?: string } | null
  timeline: Array<{
    id: string
    type: string
    label: string
    projectId?: string | null
    at: string
  }>

  hydrate: () => Promise<void>
  refreshCompanionMessage: () => Promise<void>
  refreshTimeline: () => Promise<void>
  updateProfileLocal: (patch: Partial<MemoryProfile>) => void
  saveProfile: (patch: Partial<{
    creatorDna: MemoryProfile['creatorDna']
    creatorMemory: MemoryProfile['creatorMemory']
  }>) => Promise<boolean>
}

export const useCreatorMemoryStore = create<CreatorMemoryStore>()(
  persist(
    (set, get) => ({
      profile: emptyMemoryProfile(),
      hydrated: false,
      loading: false,
      companionMessage: null,
      timeline: [],

      hydrate: async () => {
        if (get().loading) return
        set({ loading: true })
        try {
          const res = await fetch('/api/memory/profile', { cache: 'no-store' })
          if (res.ok) {
            const data = (await res.json()) as { profile?: MemoryProfile }
            if (data.profile) {
              set({ profile: data.profile, hydrated: true })
            }
          }
          void get().refreshCompanionMessage()
        } catch {
          /* cache only */
        } finally {
          set({ loading: false, hydrated: true })
        }
      },

      refreshCompanionMessage: async () => {
        try {
          const res = await fetch('/api/memory/companion-message', { cache: 'no-store' })
          if (res.ok) {
            const data = (await res.json()) as {
              greeting?: string
              insight?: string
              badge?: string
            }
            if (data.greeting) {
              set({
                companionMessage: {
                  greeting: data.greeting,
                  insight: data.insight ?? '',
                  badge: data.badge,
                },
              })
            }
          }
        } catch {
          /* ignore */
        }
      },

      refreshTimeline: async () => {
        try {
          const res = await fetch('/api/memory/timeline', { cache: 'no-store' })
          if (res.ok) {
            const data = (await res.json()) as { timeline?: CreatorMemoryStore['timeline'] }
            if (data.timeline) set({ timeline: data.timeline })
          }
        } catch {
          /* ignore */
        }
      },

      updateProfileLocal: (patch) => {
        set((s) => ({ profile: { ...s.profile, ...patch } }))
      },

      saveProfile: async (patch) => {
        try {
          const res = await fetch('/api/memory/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          })
          if (!res.ok) return false
          const data = (await res.json()) as { profile?: MemoryProfile }
          if (data.profile) set({ profile: data.profile })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'mugtee-creator-memory-store',
      partialize: (s) => ({ profile: s.profile }),
    }
  )
)
