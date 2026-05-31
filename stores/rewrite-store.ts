import { create } from 'zustand'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import {
  buildQuickCutRewritePatch,
  type QuickCutRewritePatch,
} from '@/lib/rewrite/apply-quick-cut-rewrite'
import { persistProjectEdit } from '@/lib/rewrite/persist-project-edit'
import type { RewriteContentType, RewriteVariant } from '@/lib/rewrite/rewrite-actions'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export type RewriteHistoryEntry = {
  id: string
  projectId: string | null
  contentType: RewriteContentType
  rewriteAction: RewriteVariant
  beforeText: string
  afterText: string
  createdAt: number
}

type UndoFrame = {
  undo: QuickCutRewritePatch
  redo: QuickCutRewritePatch
  meta: Omit<RewriteHistoryEntry, 'id' | 'createdAt'>
}

type RewriteStore = {
  rewriteLoading: boolean
  rewriteHistory: RewriteHistoryEntry[]
  undoStack: UndoFrame[]
  redoStack: UndoFrame[]
  setRewriteLoading: (loading: boolean) => void
  applyDirectorRewrite: (input: {
    original: string
    replacement: string
    variant: RewriteVariant
    contentType: RewriteContentType
    projectId?: string | null
  }) => QuickCutRewritePatch | null
  undoRewrite: () => boolean
  redoRewrite: () => boolean
  clearRewriteHistory: () => void
}

function newId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useRewriteStore = create<RewriteStore>((set, get) => ({
  rewriteLoading: false,
  rewriteHistory: [],
  undoStack: [],
  redoStack: [],

  setRewriteLoading: (loading) => set({ rewriteLoading: loading }),

  applyDirectorRewrite: ({ original, replacement, variant, contentType, projectId }) => {
    const qc = useQuickCutGenerationStore.getState()
    const state = {
      hook: qc.hook,
      script: qc.script,
      scriptBeats: qc.scriptBeats,
      payoff: qc.payoff,
      cta: qc.cta,
      scenes: qc.scenes,
    }

    const forward = buildQuickCutRewritePatch(
      state,
      original,
      replacement,
      contentType,
      variant
    )
    if (Object.keys(forward).length === 0) return null

    const undo: QuickCutRewritePatch = {}
    if (forward.hook !== undefined) undo.hook = state.hook
    if (forward.script !== undefined) undo.script = state.script
    if (forward.scriptBeats !== undefined) undo.scriptBeats = state.scriptBeats
    if (forward.payoff !== undefined) undo.payoff = state.payoff
    if (forward.cta !== undefined) undo.cta = state.cta
    if (forward.scenes !== undefined) undo.scenes = state.scenes

    useQuickCutGenerationStore.setState(forward)
    void qc.saveProject()

    const pid = projectId ?? qc.savedProjectId
    const entry: RewriteHistoryEntry = {
      id: newId(),
      projectId: pid,
      contentType,
      rewriteAction: variant,
      beforeText: original,
      afterText: replacement,
      createdAt: Date.now(),
    }

    set((s) => ({
      rewriteHistory: [entry, ...s.rewriteHistory].slice(0, 50),
      undoStack: [...s.undoStack, { undo, redo: forward, meta: entry }],
      redoStack: [],
    }))

    trackEvent(AnalyticsEvents.REWRITE_ACCEPT, {
      projectId: pid,
      metadata: { content_type: contentType, rewrite_action: variant },
    })

    if (pid) {
      persistProjectEdit({
        projectId: pid,
        contentType,
        beforeText: original,
        afterText: replacement,
        rewriteAction: variant,
      })
    }

    return forward
  },

  undoRewrite: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return false

    const frame = undoStack[undoStack.length - 1]
    useQuickCutGenerationStore.setState(frame.undo)
    void useQuickCutGenerationStore.getState().saveProject()

    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, frame],
    })

    trackEvent(AnalyticsEvents.REWRITE_REVERT, {
      projectId: frame.meta.projectId,
      metadata: {
        content_type: frame.meta.contentType,
        rewrite_action: frame.meta.rewriteAction,
        direction: 'undo',
      },
    })

    return true
  },

  redoRewrite: () => {
    const { redoStack } = get()
    if (redoStack.length === 0) return false

    const frame = redoStack[redoStack.length - 1]
    useQuickCutGenerationStore.setState(frame.redo)
    void useQuickCutGenerationStore.getState().saveProject()

    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, frame],
    })

    trackEvent(AnalyticsEvents.REWRITE_REVERT, {
      projectId: frame.meta.projectId,
      metadata: {
        content_type: frame.meta.contentType,
        rewrite_action: frame.meta.rewriteAction,
        direction: 'redo',
      },
    })

    return true
  },

  clearRewriteHistory: () => set({ rewriteHistory: [], undoStack: [], redoStack: [] }),
}))
