'use client'

import { create } from 'zustand'
import type {
  CeoBriefing,
  FeedSection,
  OpportunityItem,
  PublishingReview,
  SmartSuggestion,
  WeeklyContentPlan,
} from '@/lib/agent/types'
import type { CompetitorInsight } from '@/lib/agent/types'

type CreatorAgentStore = {
  opportunities: OpportunityItem[]
  feedSections: FeedSection[]
  feedDate: string | null
  weeklyPlan: WeeklyContentPlan | null
  suggestions: SmartSuggestion[]
  briefing: CeoBriefing | null
  competitors: Array<{ id: string; name: string; channel_url?: string; platform?: string }>
  competitorInsights: CompetitorInsight[]
  publishingReview: PublishingReview | null
  loading: boolean
  briefingOpen: boolean

  fetchOpportunities: () => Promise<void>
  fetchWeeklyPlan: () => Promise<void>
  fetchSuggestions: () => Promise<void>
  fetchBriefing: (openAi?: boolean) => Promise<void>
  fetchCompetitors: () => Promise<void>
  captureIdea: (text: string) => Promise<{ projectPrompt?: string } | null>
  reviewPublishing: (input: {
    title?: string
    hook?: string
    description?: string
    tags?: string[]
    hasThumbnail?: boolean
  }) => Promise<void>
  addCompetitor: (input: { name: string; channel_url?: string; platform?: string }) => Promise<boolean>
  setBriefingOpen: (open: boolean) => void
}

export const useCreatorAgentStore = create<CreatorAgentStore>((set, get) => ({
  opportunities: [],
  feedSections: [],
  feedDate: null,
  weeklyPlan: null,
  suggestions: [],
  briefing: null,
  competitors: [],
  competitorInsights: [],
  publishingReview: null,
  loading: false,
  briefingOpen: false,

  fetchOpportunities: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/agent/opportunities', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        set({
          opportunities: data.items ?? [],
          feedSections: data.sections ?? [],
          feedDate: data.feedDate ?? null,
        })
      }
    } finally {
      set({ loading: false })
    }
  },

  fetchWeeklyPlan: async () => {
    try {
      const res = await fetch('/api/agent/weekly-plan', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.plan) set({ weeklyPlan: data.plan })
    } catch {
      /* ignore */
    }
  },

  fetchSuggestions: async () => {
    try {
      const res = await fetch('/api/agent/suggestions', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) set({ suggestions: data.suggestions ?? [] })
    } catch {
      /* ignore */
    }
  },

  fetchBriefing: async (openAi) => {
    try {
      const qs = openAi ? '?openai=1' : ''
      const res = await fetch(`/api/agent/ceo-briefing${qs}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.briefing) set({ briefing: data.briefing })
    } catch {
      /* ignore */
    }
  },

  fetchCompetitors: async () => {
    try {
      const res = await fetch('/api/agent/competitors', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        set({
          competitors: data.competitors ?? [],
          competitorInsights: data.insights ?? [],
        })
      }
    } catch {
      /* ignore */
    }
  },

  captureIdea: async (text) => {
    try {
      const res = await fetch('/api/agent/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return null
      return { projectPrompt: data.projectPrompt }
    } catch {
      return null
    }
  },

  reviewPublishing: async (input) => {
    try {
      const res = await fetch('/api/agent/publishing-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.review) set({ publishingReview: data.review })
    } catch {
      /* ignore */
    }
  },

  addCompetitor: async (input) => {
    try {
      const res = await fetch('/api/agent/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) return false
      await get().fetchCompetitors()
      return true
    } catch {
      return false
    }
  },

  setBriefingOpen: (open) => set({ briefingOpen: open }),
}))
