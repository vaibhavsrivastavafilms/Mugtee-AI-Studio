'use client'

import { create } from 'zustand'
import {
  feedbackStorageKey,
  hasFeedbackPromptDone,
  markFeedbackPromptDone,
  type FeedbackType,
} from '@/lib/creator/moment-feedback'

type PromptKind = 'output-rating' | 'export' | 'suggestion'

function kindForType(type: FeedbackType): PromptKind {
  if (type === 'output_rating') return 'output-rating'
  if (type === 'export_satisfaction') return 'export'
  return 'suggestion'
}

type FeedbackStore = {
  scopeId: string
  setScopeId: (id: string | null | undefined) => void
  dismissed: Record<PromptKind, boolean>
  submitted: Record<PromptKind, boolean>
  hydrateFromStorage: () => void
  dismiss: (kind: PromptKind) => void
  markSubmitted: (type: FeedbackType) => void
  shouldShow: (type: FeedbackType) => boolean
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  scopeId: 'session',
  setScopeId: (id) => {
    const scopeId = String(id || '').trim() || 'session'
    set({ scopeId })
    get().hydrateFromStorage()
  },
  dismissed: { 'output-rating': false, export: false, suggestion: false },
  submitted: { 'output-rating': false, export: false, suggestion: false },
  hydrateFromStorage: () => {
    const { scopeId } = get()
    set({
      submitted: {
        'output-rating': hasFeedbackPromptDone('output-rating', scopeId),
        export: hasFeedbackPromptDone('export', scopeId),
        suggestion: hasFeedbackPromptDone('suggestion', scopeId),
      },
    })
  },
  dismiss: (kind) => {
    const { scopeId } = get()
    markFeedbackPromptDone(kind, scopeId)
    set((s) => ({
      dismissed: { ...s.dismissed, [kind]: true },
      submitted: { ...s.submitted, [kind]: true },
    }))
  },
  markSubmitted: (type) => {
    const kind = kindForType(type)
    const { scopeId } = get()
    markFeedbackPromptDone(kind, scopeId)
    set((s) => ({
      submitted: { ...s.submitted, [kind]: true },
      dismissed: { ...s.dismissed, [kind]: true },
    }))
  },
  shouldShow: (type) => {
    const kind = kindForType(type)
    const { dismissed, submitted, scopeId } = get()
    if (dismissed[kind] || submitted[kind]) return false
    return !hasFeedbackPromptDone(kind, scopeId)
  },
}))

export { feedbackStorageKey }
