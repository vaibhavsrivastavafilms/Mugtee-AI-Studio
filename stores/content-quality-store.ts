'use client'

import { create } from 'zustand'
import { excerptForQualityReview, reviewContentQualityRules } from '@/lib/quality/content-quality-review'
import type { ContentQualityScore } from '@/lib/quality/types'

export type QualityReviewStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

export type QualityReviewInput = {
  sessionKey: string
  hook?: string
  script?: string
  cta?: string
  platform?: string
  tone?: string
  duration?: number
  /** When false, skip LLM and use rules only */
  allowLlm?: boolean
}

type ContentQualityState = {
  contentQualityScore: ContentQualityScore | null
  qualityReviewStatus: QualityReviewStatus
  qualityReviewSessionKey: string | null
  runQualityReview: (input: QualityReviewInput) => Promise<void>
  resetQualityReview: () => void
}

export const useContentQualityStore = create<ContentQualityState>((set, get) => ({
  contentQualityScore: null,
  qualityReviewStatus: 'idle',
  qualityReviewSessionKey: null,

  resetQualityReview: () => {
    set({
      contentQualityScore: null,
      qualityReviewStatus: 'idle',
      qualityReviewSessionKey: null,
    })
  },

  runQualityReview: async (input) => {
    const key = input.sessionKey.trim()
    if (!key) return

    const state = get()
    if (
      state.qualityReviewSessionKey === key &&
      state.contentQualityScore &&
      state.qualityReviewStatus === 'ready'
    ) {
      return
    }

    const hasScript = Boolean(input.script?.trim())
    const hasHook = Boolean(input.hook?.trim())
    if (!hasHook && !hasScript) {
      set({ qualityReviewStatus: 'unavailable', qualityReviewSessionKey: key })
      return
    }

    set({ qualityReviewStatus: 'loading', qualityReviewSessionKey: key })

    const rulesFallback = () =>
      reviewContentQualityRules({
        hook: input.hook,
        script: input.script,
        cta: input.cta,
        platform: input.platform,
        tone: input.tone,
        duration: input.duration,
      })

    try {
      if (input.allowLlm !== false && hasScript) {
        const res = await fetch('/api/quality/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hook: input.hook,
            scriptExcerpt: excerptForQualityReview(input.hook ?? '', input.script ?? ''),
            cta: input.cta,
            platform: input.platform,
            tone: input.tone,
            duration: input.duration,
          }),
        })
        const data = await res.json().catch(() => ({}))
        const score = data?.score as ContentQualityScore | undefined
        if (res.ok && score?.overall != null) {
          set({
            contentQualityScore: score,
            qualityReviewStatus: 'ready',
            qualityReviewSessionKey: key,
          })
          return
        }
      }

      set({
        contentQualityScore: rulesFallback(),
        qualityReviewStatus: 'ready',
        qualityReviewSessionKey: key,
      })
    } catch {
      try {
        set({
          contentQualityScore: rulesFallback(),
          qualityReviewStatus: 'ready',
          qualityReviewSessionKey: key,
        })
      } catch {
        set({ qualityReviewStatus: 'unavailable', qualityReviewSessionKey: key })
      }
    }
  },
}))

export function buildQualityReviewSessionKey(
  savedProjectId: string | null,
  prompt: string,
  hook: string
): string {
  const base = savedProjectId?.trim() || 'session'
  const promptKey = prompt.trim().slice(0, 48)
  const hookKey = hook.trim().slice(0, 32)
  return `${base}:${promptKey}:${hookKey}`
}
