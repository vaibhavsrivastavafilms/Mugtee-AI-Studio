'use client'

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { trackCreatorMilestone } from '@/lib/creator/session-insights'
import { rememberCreativeSession } from '@/lib/creator/creator-memory'
import {
  captionsToPayload,
  normalizeCinematicOutput,
  parseCaptionsPayload,
  scenesToStore,
  type CinematicGenerationOutput,
} from '@/lib/cinematic/generation'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import {
  createProject as createProjectRow,
  loadProject as loadProjectRow,
  rowToState,
  stateToRowPayload,
  updateProject as updateProjectRow,
} from '@/lib/cinematic-projects'
import { coerceDuration } from '@/lib/workspace/validation'

export type CinematicProjectStatus =
  | 'idle'
  | 'draft'
  | 'editing'
  | 'reviewing'
  | 'completed'
  | 'exported'
  | 'create'
  | 'generating'
  | 'preview'
  | 'director'
  | 'scenes'
  | 'voiceover'
  | 'compile'
  | 'complete'

export type CinematicSaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface StoryboardImage {
  id: string
  url: string
  variantLabel: string
}

export interface CinematicScene {
  id: string
  index: number
  title?: string
  narration?: string
  duration?: number
  visualPrompt?: string
  imagePrompt?: string
  cameraAngle?: string
  lightingMood?: string
  environment?: string
  colorPalette?: string
  movementStyle?: string
  camera?: string
  emotion?: string
  transition?: string
  lighting?: string
  sound?: string
  imageUrl?: string
  storyboardImages?: StoryboardImage[]
  activeStoryboardId?: string
  metadata?: Record<string, unknown>
}

export interface CinematicVoice {
  voiceId?: string
  voiceName?: string
  style?: string
  audioUrl?: string
  narration?: string
}

export interface CinematicProjectState {
  id: string | null
  title: string
  prompt: string
  style: string
  duration: number
  hook: string
  summary: string
  script: string
  scenes: CinematicScene[]
  voice: CinematicVoice | null
  captions: string
  captionLines: string[]
  suggestedVoiceStyle: string
  niche: string
  status: CinematicProjectStatus
  updatedAt: string | null
  persistedId: string | null
  saveState: CinematicSaveState
  lastPersistedAt: number | null
  isHydrating: boolean
}

type CinematicProjectInput = Partial<
  Omit<
    CinematicProjectState,
    'updatedAt' | 'saveState' | 'lastPersistedAt' | 'isHydrating'
  >
>

interface CinematicProjectActions {
  createProject: (input?: CinematicProjectInput) => void
  updatePrompt: (prompt: string) => void
  updateStyle: (style: string) => void
  updateDuration: (duration: number) => void
  updateHook: (hook: string) => void
  updateSummary: (summary: string) => void
  updateScript: (script: string) => void
  updateScenes: (scenes: CinematicScene[]) => void
  updateCaptionLines: (captionLines: string[]) => void
  updateSuggestedVoiceStyle: (style: string) => void
  updateVoice: (voice: CinematicVoice | null) => void
  updateStatus: (status: CinematicProjectStatus) => void
  resetProject: () => void
  persistProject: (opts?: { silent?: boolean }) => Promise<string | null>
  hydrateProject: (id: string) => Promise<void>
  autosaveProject: () => void
}

export type CinematicProjectStore = CinematicProjectState &
  CinematicProjectActions

const INITIAL_STATE: CinematicProjectState = {
  id: null,
  title: '',
  prompt: '',
  style: 'cinematic',
  duration: 60,
  hook: '',
  summary: '',
  script: '',
  scenes: [],
  voice: null,
  captions: '',
  captionLines: [],
  suggestedVoiceStyle: 'warm_documentary',
  niche: 'storytelling',
  status: 'idle',
  updatedAt: null,
  persistedId: null,
  saveState: 'idle',
  lastPersistedAt: null,
  isHydrating: false,
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let savedFlashTimer: ReturnType<typeof setTimeout> | null = null

function touchUpdatedAt(): string {
  return new Date().toISOString()
}

function deriveTitle(prompt: string, title?: string): string {
  const trimmedTitle = (title || '').trim()
  if (trimmedTitle) return trimmedTitle

  const trimmedPrompt = prompt.trim()
  if (!trimmedPrompt) return 'Untitled project'

  return trimmedPrompt.length > 80
    ? `${trimmedPrompt.slice(0, 77)}...`
    : trimmedPrompt
}

function canPersist(state: CinematicProjectState): boolean {
  return state.prompt.trim().length >= 1 || state.script.trim().length >= 1
}

function scheduleAutosave(get: () => CinematicProjectStore) {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    const state = get()
    if (!canPersist(state) || state.isHydrating || state.saveState === 'saving') {
      return
    }
    void state.persistProject({ silent: true })
  }, 2200)
}

function markSaved(get: () => CinematicProjectStore, set: (patch: Partial<CinematicProjectStore>) => void) {
  trackCreatorMilestone('project_saved')
  const state = get()
  rememberCreativeSession({
    niche: state.niche,
    style: state.style,
    platform: 'instagram_reel',
    storyboardStyle: state.style,
    projectId: state.persistedId || state.id || undefined,
    projectTitle: state.title,
    projectStatus: state.status,
  })
  set({
    saveState: 'saved',
    lastPersistedAt: Date.now(),
  })

  if (savedFlashTimer) clearTimeout(savedFlashTimer)
  savedFlashTimer = setTimeout(() => {
    if (get().saveState === 'saved') {
      set({ saveState: 'idle' })
    }
  }, 4200)
}

export const useCinematicProjectStore = create<CinematicProjectStore>(
  (set, get) => ({
    ...INITIAL_STATE,

    createProject: (input) =>
      set(() => {
        const prompt = input?.prompt?.trim() ?? ''
        const next: CinematicProjectState = {
          ...INITIAL_STATE,
          ...input,
          id: input?.id ?? uuidv4(),
          prompt,
          title: deriveTitle(prompt, input?.title),
          style: input?.style ?? INITIAL_STATE.style,
          duration: input?.duration ?? INITIAL_STATE.duration,
          status: input?.status ?? 'create',
          updatedAt: touchUpdatedAt(),
          persistedId: input?.persistedId ?? null,
          saveState: 'idle',
          lastPersistedAt: null,
          isHydrating: false,
        }
        return next
      }),

    updatePrompt: (prompt) => {
      set((state) => ({
        prompt,
        title: state.title.trim() ? state.title : deriveTitle(prompt),
        updatedAt: touchUpdatedAt(),
      }))
      scheduleAutosave(get)
    },

    updateStyle: (style) => {
      set({ style, updatedAt: touchUpdatedAt() })
      scheduleAutosave(get)
    },

    updateDuration: (duration) => {
      set({ duration: coerceDuration(duration), updatedAt: touchUpdatedAt() })
      scheduleAutosave(get)
    },

    updateHook: (hook) => {
      set({
        hook,
        captions: hook,
        updatedAt: touchUpdatedAt(),
      })
      scheduleAutosave(get)
    },

    updateSummary: (summary) => {
      set({ summary, updatedAt: touchUpdatedAt() })
      scheduleAutosave(get)
    },

    updateScript: (script) => {
      set({ script, updatedAt: touchUpdatedAt() })
      scheduleAutosave(get)
    },

    updateScenes: (scenes) => {
      set({ scenes, updatedAt: touchUpdatedAt() })
      scheduleAutosave(get)
    },

    updateCaptionLines: (captionLines) => {
      set({
        captionLines,
        captions: captionLines.join('\n'),
        updatedAt: touchUpdatedAt(),
      })
      scheduleAutosave(get)
    },

    updateSuggestedVoiceStyle: (suggestedVoiceStyle) => {
      set({ suggestedVoiceStyle, updatedAt: touchUpdatedAt() })
      scheduleAutosave(get)
    },

    updateVoice: (voice) => {
      set({ voice, updatedAt: touchUpdatedAt() })
      scheduleAutosave(get)
    },

    updateStatus: (status) => {
      set({ status, updatedAt: touchUpdatedAt() })
      scheduleAutosave(get)
    },

    resetProject: () => {
      if (autosaveTimer) clearTimeout(autosaveTimer)
      set({ ...INITIAL_STATE })
    },

    persistProject: async (opts) => {
      const state = get()
      if (!canPersist(state)) return null

      set({ saveState: 'saving' })

      try {
        const payload = stateToRowPayload({
          id: state.id,
          title: state.title,
          prompt: state.prompt,
          style: state.style,
          duration: state.duration,
          hook: state.hook,
          summary: state.summary,
          script: state.script,
          scenes: state.scenes,
          voice: state.voice,
          captions: state.captions,
          captionLines: state.captionLines,
          suggestedVoiceStyle: state.suggestedVoiceStyle,
          niche: state.niche,
          status: state.status,
        })

        let row
        const existingId = state.persistedId || state.id
        const patch = {
          title: payload.title,
          prompt: payload.prompt,
          style: payload.style,
          duration: payload.duration,
          hook: state.hook,
          summary: state.summary,
          script: payload.script,
          scenes: payload.scenes as CinematicScene[],
          voice: payload.voice as CinematicVoice | null,
          captions: state.captions,
          captionLines: state.captionLines,
          suggestedVoiceStyle: state.suggestedVoiceStyle,
          niche: state.niche,
          status: payload.status as CinematicProjectStatus,
        }

        if (existingId) {
          row = await updateProjectRow(existingId, patch)
        } else {
          row = await createProjectRow({
            id: state.id ?? undefined,
            ...patch,
          })
        }

        set({
          id: row.id,
          persistedId: row.id,
          updatedAt: row.updated_at,
        })
        markSaved(get, set)
        return row.id
      } catch {
        set({ saveState: 'error' })
        return null
      }
    },

    hydrateProject: async (id) => {
      set({ isHydrating: true, saveState: 'idle' })
      try {
        const row = await loadProjectRow(id)
        const next = rowToState(row)
        set({
          ...next,
          persistedId: row.id,
          lastPersistedAt: new Date(row.updated_at).getTime(),
          saveState: 'idle',
          isHydrating: false,
        })
      } catch {
        set({ isHydrating: false, saveState: 'error' })
      }
    },

    autosaveProject: () => {
      scheduleAutosave(get)
    },
  })
)

/** Map storyboard-style shots into shared scene records. */
export function scenesFromStoryboardShots(
  shots: Array<Record<string, unknown>> | undefined | null
): CinematicScene[] {
  if (!Array.isArray(shots)) return []

  return shots.map((shot, index) => {
    const shotNumber =
      typeof shot.shot_number === 'number' ? shot.shot_number : index + 1

    return {
      id: String(shot.id ?? `scene-${shotNumber}`),
      index: shotNumber,
      title:
        typeof shot.visual === 'string'
          ? shot.visual
          : typeof shot.image_prompt === 'string'
            ? shot.image_prompt
            : undefined,
      narration:
        typeof shot.narration === 'string' ? shot.narration : undefined,
      duration:
        typeof shot.duration === 'number' ? shot.duration : undefined,
      camera:
        typeof shot.camera_movement === 'string'
          ? shot.camera_movement
          : typeof shot.framing === 'string'
            ? shot.framing
            : undefined,
      emotion: typeof shot.mood === 'string' ? shot.mood : undefined,
      lighting:
        typeof shot.lighting === 'string' ? shot.lighting : undefined,
      imageUrl:
        typeof shot.image_url === 'string' ? shot.image_url : undefined,
      metadata: shot,
    }
  })
}

/** Apply a generate-script API payload into the shared workflow store. */
export function applyGenerationToStore(
  output: Record<string, unknown> | null | undefined
) {
  if (!output) return

  let payload = output

  if (
    !Array.isArray(output.scenes) &&
    Array.isArray(output.storyboardShots)
  ) {
    payload = {
      ...output,
      scenes: scenesFromStoryboardShots(
        output.storyboardShots as Array<Record<string, unknown>>
      ).map((scene) => ({
        id: scene.id,
        title: scene.title,
        description: scene.narration,
        duration: scene.duration || 4,
      })),
    }
  }

  const store = useCinematicProjectStore.getState()
  const normalized = normalizeCinematicOutput(payload, {
    topic:
      typeof payload.title === 'string'
        ? payload.title
        : store.prompt,
    duration: store.duration,
    tone: store.style,
    niche: inferNicheFromBrief({
      topic: store.prompt,
      tone: store.style,
      style: store.style,
      niche:
        typeof payload.niche === 'string'
          ? payload.niche
          : store.niche,
    }),
  })

  applyCinematicGeneration(normalized)
}

export function applyCinematicGeneration(output: CinematicGenerationOutput) {
  useCinematicProjectStore.setState({
    title: output.title,
    hook: output.hook,
    summary: output.summary,
    script: output.script,
    scenes: scenesToStore(output.scenes),
    captionLines: output.captions,
    captions: output.captions.join('\n') || output.hook,
    suggestedVoiceStyle: output.suggestedVoiceStyle,
    niche: output.niche,
    status: 'preview',
    updatedAt: touchUpdatedAt(),
  })

  useCinematicProjectStore.getState().autosaveProject()
}

export function relSavedLabel(ms: number | null | undefined): string {
  if (!ms) return ''
  const dt = Date.now() - ms
  if (dt < 5_000) return 'Synced just now'
  if (dt < 60_000) return 'Synced moments ago'
  const mins = Math.floor(dt / 60_000)
  if (mins < 60) return `Synced ${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Synced ${hours}h ago`
  return 'Synced recently'
}
