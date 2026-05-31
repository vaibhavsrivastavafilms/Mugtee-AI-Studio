'use client'

import { create } from 'zustand'
import type { CreatorDecision } from '@/lib/decision/types'

type CreatorDecisionStore = {
  decision: CreatorDecision | null
  loading: boolean
  hydrated: boolean
  altIndex: number

  fetchRecommended: (opts?: { log?: boolean }) => Promise<void>
  acceptDecision: (decision: CreatorDecision) => Promise<string | null>
  cycleAlternative: () => void
  setAltIndex: (index: number) => void
}

export const useCreatorDecisionStore = create<CreatorDecisionStore>((set, get) => ({
  decision: null,
  loading: false,
  hydrated: false,
  altIndex: 0,

  fetchRecommended: async (opts) => {
    if (get().loading) return
    if (get().decision && get().hydrated && opts?.log === undefined) return
    set({ loading: true })
    try {
      const log = opts?.log !== false ? '' : '?log=0'
      const res = await fetch(`/api/decision/recommended-next-move${log}`, {
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.decision) {
        set({ decision: data.decision as CreatorDecision, hydrated: true, altIndex: 0 })
      }
    } catch {
      /* ignore */
    } finally {
      set({ loading: false, hydrated: true })
    }
  },

  acceptDecision: async (decision) => {
    const p = decision.recommendedProject
    try {
      const res = await fetch('/api/decision/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: p.topic,
          title: p.title,
          format: p.format,
          platform: p.platform,
          opportunityScore: decision.opportunityScore,
          confidenceScore: decision.confidenceScore,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.createHref === 'string') return data.createHref as string
    } catch {
      /* ignore */
    }
    return null
  },

  cycleAlternative: () => {
    const { decision, altIndex } = get()
    if (!decision?.alternatives?.length) return
    const next = (altIndex + 1) % (decision.alternatives.length + 1)
    set({ altIndex: next })
  },

  setAltIndex: (index) => set({ altIndex: Math.max(0, index) }),
}))

/** Active decision (primary or selected alternative) */
export function activeDecision(
  decision: CreatorDecision | null,
  altIndex: number
): CreatorDecision | null {
  if (!decision) return null
  if (altIndex <= 0) return decision
  const alt = decision.alternatives[altIndex - 1]
  return alt ?? decision
}
