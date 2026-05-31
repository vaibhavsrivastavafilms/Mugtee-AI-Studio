'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  CreativeBrief,
  CreatorMemory,
  DirectorNote,
  EmotionalStoryAnalysis,
  ReflectionHighlight,
  StoryExpansionSuggestion,
  ViewerJourneySegment,
  DiscoveryStepId,
} from '@/lib/companion/types'
import { DISCOVERY_STEP_ORDER } from '@/lib/companion/types'
import {
  applyDiscoveryAnswer,
  isDiscoveryComplete,
  normalizeCreativeBrief,
} from '@/lib/companion/creative-discovery'
import { normalizeCreatorMemory } from '@/lib/companion/creator-memory'

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `sess_${Date.now()}`
}

type CompanionState = {
  sessionId: string
  discoveryStep: DiscoveryStepId
  discoveryActive: boolean
  creativeBrief: CreativeBrief
  directorNotes: DirectorNote[]
  directorNotesLoading: boolean
  directorSessionCapReached: boolean
  creatorMemory: CreatorMemory
  emotionalAnalysis: EmotionalStoryAnalysis | null
  viewerJourney: ViewerJourneySegment[]
  expansions: StoryExpansionSuggestion[]
  reflectionHighlight: ReflectionHighlight | null
  reflectionSubmitted: boolean
  projectId: string | null

  setProjectId: (id: string | null) => void
  startDiscovery: () => void
  skipDiscovery: () => void
  setDiscoveryStep: (step: DiscoveryStepId) => void
  answerDiscovery: (step: DiscoveryStepId, answer: string) => void
  setCreativeBrief: (brief: CreativeBrief) => void
  saveDiscovery: (projectId?: string) => Promise<boolean>
  fetchDirectorNote: (ctx: {
    hook?: string
    script?: string
    title?: string
    style?: string
    sceneRef?: string
    generationStep?: string
  }) => Promise<DirectorNote | null>
  loadCreatorMemory: () => Promise<void>
  saveCreatorMemory: (patch: Partial<CreatorMemory>) => Promise<void>
  runEmotionalAnalysis: (input: {
    hook?: string
    script?: string
    scenes?: Array<{ title?: string; description?: string; duration?: number }>
    duration?: number
  }) => Promise<void>
  runViewerJourney: (input: {
    script?: string
    hook?: string
    scenes?: Array<{ title?: string; description?: string; duration?: number }>
    duration?: number
  }) => Promise<void>
  fetchExpansions: (input: {
    title?: string
    hook?: string
    script?: string
    niche?: string
  }) => Promise<void>
  submitReflection: (highlight: ReflectionHighlight) => Promise<boolean>
  resetCompanionSession: () => void
}

export const useCompanionStore = create<CompanionState>()(
  persist(
    (set, get) => ({
      sessionId: newSessionId(),
      discoveryStep: DISCOVERY_STEP_ORDER[0],
      discoveryActive: false,
      creativeBrief: {},
      directorNotes: [],
      directorNotesLoading: false,
      directorSessionCapReached: false,
      creatorMemory: {},
      emotionalAnalysis: null,
      viewerJourney: [],
      expansions: [],
      reflectionHighlight: null,
      reflectionSubmitted: false,
      projectId: null,

      setProjectId: (id) => set({ projectId: id }),

      startDiscovery: () =>
        set({
          discoveryActive: true,
          discoveryStep: DISCOVERY_STEP_ORDER[0],
        }),

      skipDiscovery: () => set({ discoveryActive: false }),

      setDiscoveryStep: (step) => set({ discoveryStep: step }),

      answerDiscovery: (step, answer) => {
        const brief = applyDiscoveryAnswer(get().creativeBrief, step, answer)
        const idx = DISCOVERY_STEP_ORDER.indexOf(step)
        const nextStep = DISCOVERY_STEP_ORDER[idx + 1]
        set({
          creativeBrief: brief,
          discoveryStep: nextStep ?? step,
          discoveryActive: nextStep ? true : !isDiscoveryComplete(brief),
        })
      },

      setCreativeBrief: (brief) =>
        set({ creativeBrief: normalizeCreativeBrief(brief) }),

      saveDiscovery: async (projectId) => {
        const brief = get().creativeBrief
        const pid = projectId ?? get().projectId
        try {
          const res = await fetch('/api/companion/discovery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creativeBrief: brief, projectId: pid }),
          })
          if (!res.ok) return false
          const data = (await res.json()) as { creativeBrief?: CreativeBrief }
          if (data.creativeBrief) {
            set({
              creativeBrief: normalizeCreativeBrief(data.creativeBrief),
              discoveryActive: false,
            })
          } else {
            set({ discoveryActive: false })
          }
          return true
        } catch {
          set({ discoveryActive: false })
          return false
        }
      },

      fetchDirectorNote: async (ctx) => {
        if (get().directorSessionCapReached) return null
        set({ directorNotesLoading: true })
        try {
          const res = await fetch('/api/companion/director-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: get().sessionId,
              projectId: get().projectId,
              ...ctx,
            }),
          })
          const data = (await res.json()) as {
            note?: DirectorNote
            capReached?: boolean
          }
          if (data.capReached) {
            set({ directorSessionCapReached: true, directorNotesLoading: false })
            return null
          }
          if (data.note) {
            set((s) => ({
              directorNotes: [...s.directorNotes, data.note!],
              directorNotesLoading: false,
            }))
            return data.note
          }
        } catch {
          /* ignore */
        }
        set({ directorNotesLoading: false })
        return null
      },

      loadCreatorMemory: async () => {
        try {
          const res = await fetch('/api/companion/creator-memory', { cache: 'no-store' })
          if (res.ok) {
            const data = (await res.json()) as { creatorMemory?: CreatorMemory }
            set({ creatorMemory: normalizeCreatorMemory(data.creatorMemory) })
          }
        } catch {
          /* ignore */
        }
      },

      saveCreatorMemory: async (patch) => {
        const merged = normalizeCreatorMemory({ ...get().creatorMemory, ...patch })
        set({ creatorMemory: merged })
        try {
          await fetch('/api/companion/creator-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creatorMemory: merged }),
          })
        } catch {
          /* cache only */
        }
      },

      runEmotionalAnalysis: async (input) => {
        try {
          const res = await fetch('/api/companion/emotional-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (res.ok) {
            const data = (await res.json()) as { analysis?: EmotionalStoryAnalysis }
            if (data.analysis) set({ emotionalAnalysis: data.analysis })
          }
        } catch {
          /* client fallback in component */
        }
      },

      runViewerJourney: async (input) => {
        try {
          const res = await fetch('/api/companion/emotional-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...input, includeJourney: true }),
          })
          if (res.ok) {
            const data = (await res.json()) as { journey?: ViewerJourneySegment[] }
            if (data.journey) set({ viewerJourney: data.journey })
          }
        } catch {
          /* ignore */
        }
      },

      fetchExpansions: async (input) => {
        try {
          const res = await fetch('/api/companion/story-expansions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...input,
              brief: get().creativeBrief,
            }),
          })
          if (res.ok) {
            const data = (await res.json()) as { expansions?: StoryExpansionSuggestion[] }
            if (data.expansions) set({ expansions: data.expansions })
          }
        } catch {
          /* ignore */
        }
      },

      submitReflection: async (highlight) => {
        set({ reflectionHighlight: highlight })
        try {
          const res = await fetch('/api/companion/reflection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              highlight,
              projectId: get().projectId,
              brief: get().creativeBrief,
            }),
          })
          if (res.ok) {
            set({ reflectionSubmitted: true })
            void get().loadCreatorMemory()
            return true
          }
        } catch {
          /* ignore */
        }
        return false
      },

      resetCompanionSession: () =>
        set({
          sessionId: newSessionId(),
          directorNotes: [],
          directorSessionCapReached: false,
          emotionalAnalysis: null,
          viewerJourney: [],
          expansions: [],
          reflectionHighlight: null,
          reflectionSubmitted: false,
        }),
    }),
    {
      name: 'mugtee-companion-store',
      partialize: (s) => ({
        creativeBrief: s.creativeBrief,
        creatorMemory: s.creatorMemory,
        sessionId: s.sessionId,
      }),
    }
  )
)
