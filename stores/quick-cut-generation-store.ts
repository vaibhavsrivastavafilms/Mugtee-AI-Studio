'use client'

import { create } from 'zustand'
import {
  ensureScenesHaveImagePrompts,
  extractCharacterDescription,
  scenesWithCharacterImagePrompts,
  type GeneratedScene,
} from '@/lib/cinematic/generation'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import { isHookTooSimilar } from '@/lib/cinematic/hook-variation'
import { applyGenerationToStore } from '@/stores/cinematic-project'
import { saveQuickCutPreview } from '@/lib/cinematic/quick-cut/preview-session'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { scenesToStore } from '@/lib/cinematic/generation'
import {
  archiveGeneratedProject,
  CinematicProjectsUnavailableError,
  CINEMATIC_PROJECTS_MIGRATION_HINT,
  isCinematicProjectsUnavailable,
  type ArchiveGeneratedProjectInput,
} from '@/lib/cinematic-projects'
import { simulateMockExport } from '@/lib/cinematic/quick-cut/mock-export.client'
import type { QuickCutPipelineStatus } from '@/lib/cinematic/quick-cut/pipeline-status'
import { buildEmotionalPreviewRhythm, mergePreviewRhythm } from '@/lib/cinematic/preview/emotional-preview-rhythm'
import {
  clearHookSession,
  loadHookSession,
  saveHookSession,
} from '@/lib/cinematic/quick-cut/hook-session'
import { regenerateHook as requestHookRegen } from '@/lib/cinematic/refinement-client'
import {
  generationStepToTab,
  type QuickCutStageTab,
} from '@/lib/cinematic/quick-cut/stage-tabs'

export type QuickCutGenerationStep =
  | 'idle'
  | 'analyzing'
  | 'title'
  | 'hook'
  | 'script'
  | 'scenes'
  | 'images'
  | 'voice'
  | 'render'
  | 'complete'
  | 'error'

export const STEP_PROGRESS: Record<QuickCutGenerationStep, number> = {
  idle: 0,
  analyzing: 0,
  title: 10,
  hook: 15,
  script: 30,
  scenes: 45,
  images: 60,
  voice: 75,
  render: 88,
  complete: 100,
  error: 0,
}

export const STEP_LABELS: Record<QuickCutGenerationStep, string> = {
  idle: '',
  analyzing: 'Reading your brief…',
  title: 'Generating viral title…',
  hook: 'Crafting hook…',
  script: 'Writing cinematic script…',
  scenes: 'Building emotional pacing…',
  images: 'Generating cinematic visuals…',
  voice: 'Synthesizing voiceover…',
  render: 'Packaging storyboard export…',
  complete: 'Your cinematic video is ready',
  error: 'Generation paused',
}

export type QuickCutInput = {
  prompt: string
  style?: string
  duration?: number
  imageNote?: string
  voiceNote?: string
  keywords?: string[]
}

export type QuickCutSaveState = 'idle' | 'saving' | 'saved' | 'error'

interface QuickCutGenerationState {
  generationStep: QuickCutGenerationStep
  activeStageTab: QuickCutStageTab
  stageTabPinned: boolean
  prompt: string
  title: string
  hook: string
  previousHooks: string[]
  hookVariantNumber: number
  script: string
  characterDescription: string
  scenes: GeneratedScene[]
  storyboard: GeneratedScene[]
  regeneratingSceneIds: string[]
  directingSceneLabel: string | null
  voiceUrl: string | null
  waveform: number[]
  progress: number
  eta: number
  videoUrl: string | null
  renderPollUrl: string | null
  renderError: string | null
  renderStatusLabel: string | null
  exportPackageReady: boolean
  videoRenderEnabled: boolean
  virlo: VirloMetadata | null
  isRegeneratingHook: boolean
  mock: boolean
  missingKeys: string[]
  pipeline: QuickCutPipelineStatus | null
  error: string | null
  isGenerating: boolean
  isComplete: boolean
  savedProjectId: string | null
  saveState: QuickCutSaveState
  saveError: string | null
  lastSavedAt: number | null
}

interface QuickCutGenerationActions {
  reset: () => void
  setActiveStageTab: (tab: QuickCutStageTab, pinned?: boolean) => void
  followPipelineStage: () => void
  runPipeline: (input: QuickCutInput) => Promise<void>
  regenerateHook: () => Promise<void>
  regenerateSceneImage: (sceneId: string) => Promise<void>
  updateSceneImagePrompt: (sceneId: string, imagePrompt: string) => Promise<void>
  generateSceneVariations: (sceneId: string) => Promise<void>
  retryVideoRender: () => Promise<void>
  resumeRenderPoll: () => Promise<void>
  saveProject: () => Promise<string | null>
}

const INITIAL: QuickCutGenerationState = {
  generationStep: 'idle',
  activeStageTab: 'title',
  stageTabPinned: false,
  prompt: '',
  title: '',
  hook: '',
  previousHooks: [],
  hookVariantNumber: 1,
  script: '',
  scenes: [],
  storyboard: [],
  characterDescription: '',
  directingSceneLabel: null,
  regeneratingSceneIds: [],
  voiceUrl: null,
  waveform: [],
  progress: 0,
  eta: 14,
  videoUrl: null,
  renderPollUrl: null,
  renderError: null,
  renderStatusLabel: null,
  exportPackageReady: false,
  videoRenderEnabled: false,
  virlo: null,
  isRegeneratingHook: false,
  mock: false,
  missingKeys: [],
  pipeline: null,
  error: null,
  isGenerating: false,
  isComplete: false,
  savedProjectId: null,
  saveState: 'idle',
  saveError: null,
  lastSavedAt: null,
}

const SAVE_FLASH_MS = 2500

function flashSavedState() {
  setTimeout(() => {
    const current = useQuickCutGenerationStore.getState()
    if (current.saveState === 'saved') {
      useQuickCutGenerationStore.setState({ saveState: 'idle' })
    }
  }, SAVE_FLASH_MS)
}

function buildGenerationOutput(
  state: QuickCutGenerationState
): CinematicGenerationOutput {
  return {
    title: state.title,
    hook: state.hook,
    summary: state.hook,
    script: state.script,
    scenes: state.scenes.map((s, i) => ({
      id: s.id || `scene-${i}`,
      title: s.title || `Scene ${i + 1}`,
      description: s.description || '',
      duration: s.duration ?? 4,
      visualPrompt: s.visualPrompt || '',
      imagePrompt: s.imagePrompt || '',
      cameraAngle: s.cameraAngle || 'Cinematic medium',
      lightingMood: s.lightingMood || 'Moody contrast',
      environment: s.environment || 'Abstract cinematic',
      colorPalette: s.colorPalette || 'Deep shadow, gold highlight',
      movementStyle: s.movementStyle || 'Slow push-in',
      imageUrl: s.imageUrl,
    })),
    captions: state.script.split('\n').filter(Boolean).slice(0, 8),
    captionPack: {
      primary: state.hook,
      cta: 'Follow for more cinematic stories',
      hashtags: ['#cinematic', '#storytelling', '#faceless'],
    },
    suggestedVoiceStyle: 'warm_documentary',
    niche: 'storytelling',
  }
}

function buildArchiveInput(
  state: QuickCutGenerationState,
  output: CinematicGenerationOutput
): ArchiveGeneratedProjectInput {
  const storedScenes = scenesToStore(output.scenes)
  const thumbnail =
    storedScenes[0]?.imageUrl?.trim() ??
    storedScenes.find((s) => s.imageUrl)?.imageUrl ??
    storedScenes[0]?.storyboardImages?.[0]?.url ??
    null

  return {
    projectId: state.savedProjectId,
    title: state.title || 'Untitled reel',
    prompt: state.prompt,
    mode: 'quick',
    script: state.script,
    scenes: storedScenes,
    storyboard: storedScenes,
    voice: state.voiceUrl
      ? {
          voiceName: 'Cinematic Narrator',
          style: 'warm_documentary',
          audioUrl: state.voiceUrl,
          narration: state.script,
        }
      : null,
    duration: 60,
    status: state.videoUrl ? 'complete' : 'preview',
    video_url: state.videoUrl,
    thumbnail_url: thumbnail,
    hook: state.hook,
    summary: state.hook,
    captionLines: output.captions,
    virlo: state.virlo,
  }
}

function resolveSaveError(err: unknown): string {
  if (err instanceof CinematicProjectsUnavailableError) return err.message
  if (isCinematicProjectsUnavailable(err)) return CINEMATIC_PROJECTS_MIGRATION_HINT
  if (err instanceof Error && err.message === 'Not signed in') {
    return 'Sign in to save projects to your library.'
  }
  if (err instanceof Error && err.message.trim()) return err.message
  return 'Could not save to library — try again.'
}

async function archiveQuickCutProject(
  state: QuickCutGenerationState
): Promise<string | null> {
  if (!state.script && state.scenes.length < 1) return null
  const output = buildGenerationOutput(state)
  const row = await archiveGeneratedProject(buildArchiveInput(state, output))
  if (!row?.id) throw new Error('Save returned no project id')
  useQuickCutGenerationStore.setState({
    savedProjectId: row.id,
    saveState: 'saved',
    saveError: null,
    lastSavedAt: Date.now(),
  })
  flashSavedState()
  return row.id
}

async function ensureProjectArchived(
  state: QuickCutGenerationState
): Promise<string | null> {
  if (state.savedProjectId) return state.savedProjectId
  if (!state.script && state.scenes.length < 1) return null
  return archiveQuickCutProject(state)
}

function appendPreviousHook(previousHooks: string[], hook: string): string[] {
  const trimmed = hook.trim()
  if (!trimmed) return previousHooks
  if (previousHooks.some((h) => h.trim() === trimmed)) return previousHooks
  return [...previousHooks, trimmed]
}

function buildQuickCutRegenPayload(state: QuickCutGenerationState) {
  return {
    topic: state.prompt,
    prompt: state.prompt,
    tone: 'cinematic',
    style: 'cinematic',
    duration: 60,
    niche: 'storytelling' as const,
    hook: state.hook,
    summary: state.hook,
    script: state.script,
    scenes: state.scenes.map((scene, i) => ({
      id: scene.id || `scene-${i}`,
      index: i + 1,
      title: scene.title,
      narration: scene.description,
      duration: scene.duration,
      visualPrompt: scene.visualPrompt,
      cameraAngle: scene.cameraAngle,
      lightingMood: scene.lightingMood,
      environment: scene.environment,
      colorPalette: scene.colorPalette,
      movementStyle: scene.movementStyle,
    })),
    captionLines: state.script.split('\n').filter(Boolean).slice(0, 8),
    suggestedVoiceStyle: 'warm_documentary',
  }
}

async function requestHookRegeneration(
  state: QuickCutGenerationState,
  strongVariation = false
): Promise<{
  hook: string
  hookVariantNumber?: number
  hookFramework?: string
  virlo?: VirloMetadata | null
}> {
  try {
    return await requestHookRegen(buildQuickCutRegenPayload(state), {
      previousHooks: state.previousHooks,
      hookVariantIndex: state.previousHooks.length + (strongVariation ? 1 : 0),
      hookVariantNumber: state.hookVariantNumber,
      strongVariation,
      emotionalGoal: state.virlo?.emotionalGoal,
    })
  } catch {
    const res = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: state.prompt,
        sessionSeed: `${state.prompt}-${state.previousHooks.length}-${Date.now()}`,
        previousHooks: [...state.previousHooks, state.hook].filter(Boolean),
        hookVariantIndex: state.previousHooks.length + (strongVariation ? 1 : 0),
      }),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      throw new Error(String(data?.error || 'Hook regeneration failed'))
    }
    const hook = String(data.hook ?? '')
    if (!hook.trim()) throw new Error('Hook regeneration returned empty result')
    return {
      hook,
      virlo: (data.virlo as VirloMetadata | undefined) ?? state.virlo,
      hookVariantNumber: state.hookVariantNumber + 1,
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchSceneImages(
  state: Pick<
    QuickCutGenerationState,
    'scenes' | 'characterDescription' | 'virlo' | 'hook' | 'script'
  >,
  sceneIds?: string[],
  variation = false
): Promise<{
  scenes: GeneratedScene[]
  mock: boolean
  characterDescription?: string
}> {
  const res = await fetch('/api/generate-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenes: state.scenes,
      sceneIds,
      variation,
      characterDescription: state.characterDescription || undefined,
      virlo: state.virlo ?? undefined,
      hook: state.hook,
      script: state.script,
      niche: 'storytelling',
    }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(String(data?.error || 'Scene image generation failed'))
  }
  return {
    scenes: Array.isArray(data.scenes)
      ? ensureScenesHaveImagePrompts(data.scenes as GeneratedScene[])
      : state.scenes,
    mock: data.mock === true,
    characterDescription:
      typeof data.characterDescription === 'string'
        ? data.characterDescription
        : undefined,
  }
}

function mergeScenesById(
  current: GeneratedScene[],
  patch: GeneratedScene[],
  ids?: string[]
): GeneratedScene[] {
  const idSet = ids?.length ? new Set(ids) : null
  const patchMap = new Map(patch.map((s) => [s.id, s]))
  return current.map((scene) => {
    if (idSet && !idSet.has(scene.id)) return scene
    const next = patchMap.get(scene.id)
    return next ? { ...scene, ...next } : scene
  })
}

function appendNotes(
  prompt: string,
  imageNote?: string,
  voiceNote?: string,
  keywords?: string[]
): string {
  const parts = [prompt.trim()]
  if (keywords?.length) parts.push(`Mood keywords: ${keywords.join(', ')}`)
  if (imageNote?.trim()) parts.push(`Visual reference: ${imageNote.trim()}`)
  if (voiceNote?.trim()) parts.push(`Voice presence: ${voiceNote.trim()}`)
  return parts.filter(Boolean).join('\n\n')
}

function setStep(
  set: (patch: Partial<QuickCutGenerationState>) => void,
  get: () => QuickCutGenerationState,
  step: QuickCutGenerationStep
) {
  const progress = STEP_PROGRESS[step]
  const patch: Partial<QuickCutGenerationState> = {
    generationStep: step,
    progress,
    eta: step === 'complete' ? 0 : Math.max(0, Math.round((100 - progress) * 0.14)),
  }
  if (!get().stageTabPinned) {
    const tab = generationStepToTab(step)
    if (tab) patch.activeStageTab = tab
  }
  set(patch)
}

async function pollRenderJob(
  pollUrl: string,
  onUpdate?: (patch: { videoUrl?: string; label?: string }) => void,
  maxAttempts = 120
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await delay(1500)
    const res = await fetch(pollUrl)
    const job = (await res.json()) as Record<string, unknown>

    if (res.status === 404) {
      throw new Error('Render job expired — retrying compile')
    }
    if (!res.ok) {
      throw new Error(String(job?.error || 'Render status unavailable'))
    }

    if (typeof job.label === 'string' && job.label) {
      onUpdate?.({ label: job.label })
    }

    if (job.status === 'failed') {
      throw new Error(String(job.error || 'Video render failed'))
    }

    const url =
      typeof job.videoUrl === 'string' && job.videoUrl
        ? job.videoUrl
        : job.status === 'done' && typeof job.videoUrl === 'string'
          ? job.videoUrl
          : null

    if (url) {
      onUpdate?.({ videoUrl: url })
      return url
    }
  }
  throw new Error('Video render timed out — try again')
}

async function requestVideoRender(state: QuickCutGenerationState, asyncMode: boolean) {
  const renderRes = await fetch('/api/render-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idea: state.prompt,
      title: state.title,
      script: state.script,
      scenes: state.scenes,
      voiceUrl: state.voiceUrl,
      async: asyncMode,
      projectId: state.savedProjectId ?? undefined,
    }),
  })
  const renderData = (await renderRes.json()) as Record<string, unknown>
  return { renderRes, renderData }
}

function persistHookSession(state: QuickCutGenerationState) {
  saveHookSession({
    previousHooks: state.previousHooks,
    hookVariantNumber: state.hookVariantNumber,
  })
}

function restoreHookSession(): Pick<
  QuickCutGenerationState,
  'previousHooks' | 'hookVariantNumber'
> {
  const session = loadHookSession()
  if (!session) {
    return { previousHooks: [], hookVariantNumber: 1 }
  }
  return {
    previousHooks: session.previousHooks,
    hookVariantNumber: session.hookVariantNumber,
  }
}

function persistSession(state: QuickCutGenerationState) {
  const output = buildGenerationOutput(state)

  applyGenerationToStore(output)

  const previewFrames = state.scenes
    .map((s) => s.imageUrl)
    .filter((u): u is string => Boolean(u))

  const previewRhythm = mergePreviewRhythm(
    buildEmotionalPreviewRhythm(output.scenes, 60)
  )

  saveQuickCutPreview({
    output,
    project: {
      title: state.title,
      prompt: state.prompt,
      style: 'cinematic',
      duration: 60,
      hook: state.hook,
      summary: state.hook,
      script: state.script,
      scenes: scenesToStore(output.scenes),
      voice: state.voiceUrl
        ? {
            voiceName: 'Cinematic Narrator',
            style: 'warm_documentary',
            audioUrl: state.voiceUrl,
            narration: state.script,
          }
        : null,
      captionLines: output.captions,
      suggestedVoiceStyle: 'warm_documentary',
      niche: 'storytelling',
      status: state.videoUrl ? 'complete' : 'preview',
    },
    previewFrames,
    previewRhythm,
    presenceLine: state.hook || 'Your world is taking shape.',
    mock: state.mock,
    pipeline:
      state.pipeline ??
      ({
        steps: {
          script: state.mock ? 'fallback' : 'live',
          images: state.mock ? 'fallback' : 'live',
          voice: state.voiceUrl ? 'live' : 'fallback',
          video: state.videoUrl ? 'live' : 'skipped',
        },
        missingKeys: state.missingKeys,
        live: !state.mock,
      } satisfies QuickCutPipelineStatus),
    sessionId: `quick-cut-${Date.now()}`,
    virlo: state.virlo ?? undefined,
    videoUrl: state.videoUrl,
    voiceUrl: state.voiceUrl,
    renderPollUrl: state.renderPollUrl,
    renderError: state.renderError,
  })

  void archiveQuickCutProject(state).catch((err) => {
    useQuickCutGenerationStore.setState({
      saveState: 'error',
      saveError:
        isCinematicProjectsUnavailable(err) || err instanceof CinematicProjectsUnavailableError
          ? CINEMATIC_PROJECTS_MIGRATION_HINT
          : resolveSaveError(err),
    })
  })

  persistHookSession(state)
}

export const useQuickCutGenerationStore = create<
  QuickCutGenerationState & QuickCutGenerationActions
>((set, get) => ({
  ...INITIAL,

  reset: () => {
    clearHookSession()
    set({ ...INITIAL })
  },

  setActiveStageTab: (tab, pinned = true) =>
    set({ activeStageTab: tab, stageTabPinned: pinned }),

  followPipelineStage: () => {
    const tab = generationStepToTab(get().generationStep)
    if (tab) set({ activeStageTab: tab, stageTabPinned: false })
  },

  runPipeline: async (input) => {
    const prompt = appendNotes(input.prompt, input.imageNote, input.voiceNote, input.keywords)
    if (prompt.length < 6) return

    set({
      ...INITIAL,
      ...restoreHookSession(),
      prompt,
      isGenerating: true,
      generationStep: 'analyzing',
      activeStageTab: 'title',
      stageTabPinned: false,
      progress: 0,
      eta: 14,
    })

    const sessionSeed = prompt
    let anyMock = false
    const missingKeys = new Set<string>()

    const configRes = await fetch('/api/quick-cut/config')
    const config = (await configRes.json().catch(() => ({}))) as Record<string, boolean>
    const videoRenderEnabled = config.videoRenderEnabled === true
    set({ videoRenderEnabled })

    const freeTier = config.freeTierOnly === true
    const noteMissing = (step: 'script' | 'images' | 'voice' | 'video') => {
      if (step === 'script' && config.script !== true) {
        if (freeTier) {
          missingKeys.add('GEMINI_API_KEY')
        } else {
          missingKeys.add('GEMINI_API_KEY')
          missingKeys.add('ANTHROPIC_API_KEY')
          missingKeys.add('OPENAI_API_KEY')
        }
      }
      if (step === 'images' && !config.images) {
        if (freeTier || config.geminiDirect) {
          missingKeys.add('GEMINI_API_KEY')
        } else {
          if (!config.emergent && !config.gemini) missingKeys.add('EMERGENT_LLM_KEY')
          if (!config.openai) missingKeys.add('OPENAI_API_KEY')
        }
      }
      if (step === 'voice' && !config.elevenlabs && !config.openai && !config.emergent) {
        if (freeTier) {
          missingKeys.add('OPENAI_API_KEY')
        } else {
          missingKeys.add('ELEVENLABS_API_KEY')
          missingKeys.add('OPENAI_API_KEY')
        }
      }
      if (step === 'video' && videoRenderEnabled && !config.ffmpeg) {
        missingKeys.add('FFMPEG_PATH')
      }
    }

    try {
      setStep(set, get, 'analyzing')

      setStep(set, get, 'title')
      const titleRes = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: prompt, sessionSeed }),
      })
      const titleData = (await titleRes.json()) as Record<string, unknown>
      if (!titleRes.ok) throw new Error(String(titleData?.error || 'Title generation failed'))

      const title = String(titleData.title ?? '')
      const hook = String(titleData.hook ?? '')
      const virlo = (titleData.virlo as VirloMetadata | undefined) ?? null
      if (titleData.mock === true) anyMock = true

      setStep(set, get, 'hook')
      set({
        title,
        hook,
        virlo,
        storyboard: [],
        previousHooks: [],
        hookVariantNumber: 1,
      })
      persistHookSession(get())

      setStep(set, get, 'script')
      const scriptRes = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: prompt,
          prompt,
          tone: input.style ?? 'cinematic',
          duration: input.duration ?? 60,
          sessionSeed,
        }),
      })
      const scriptData = (await scriptRes.json()) as Record<string, unknown>
      if (!scriptRes.ok) throw new Error(String(scriptData?.error || 'Script generation failed'))

      const output = scriptData.output as Record<string, unknown> | undefined
      const script = String(output?.script ?? '')
      const scriptTitle = String(output?.title ?? title)
      const scriptHook = String(output?.hook ?? hook)
      if (scriptData.mock === true) {
        anyMock = true
        noteMissing('script')
      }

      const hookHistory = scriptHook && scriptHook !== hook ? appendPreviousHook([], hook) : []

      set({
        script,
        title: scriptTitle,
        hook: scriptHook,
        previousHooks: hookHistory,
        virlo: (scriptData.virlo as VirloMetadata | undefined) ?? virlo,
      })

      setStep(set, get, 'scenes')
      const scenesRes = await fetch('/api/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: prompt, script, sessionSeed }),
      })
      const scenesData = (await scenesRes.json()) as Record<string, unknown>
      if (!scenesRes.ok) throw new Error(String(scenesData?.error || 'Scene generation failed'))

      let scenes = ensureScenesHaveImagePrompts(
        Array.isArray(scenesData.scenes)
          ? (scenesData.scenes as GeneratedScene[])
          : []
      )
      if (scenesData.mock === true) anyMock = true

      const scriptVirlo = (scriptData.virlo as VirloMetadata | undefined) ?? virlo
      const characterDescription = extractCharacterDescription(script, scenes)
      scenes = scenesWithCharacterImagePrompts(scenes, {
        characterDescription,
        hook: scriptHook,
        emotionalGoal: scriptVirlo?.emotionalGoal,
        total: scenes.length,
      })

      set({ scenes, storyboard: scenes, characterDescription })

      setStep(set, get, 'images')
      let imgMock = false
      set({ directingSceneLabel: 'Composing visuals…' })

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]
        if (!scene?.id) continue

        set({ directingSceneLabel: `Directing Scene ${i + 1}…` })

        try {
          const imgResult = await fetchSceneImages(
            { ...get(), scenes, characterDescription, hook: scriptHook, script },
            [scene.id]
          )
          scenes = mergeScenesById(scenes, imgResult.scenes, [scene.id])
          if (imgResult.characterDescription) {
            set({ characterDescription: imgResult.characterDescription })
          }
          if (imgResult.mock) {
            imgMock = true
            anyMock = true
            noteMissing('images')
          }
          set({ scenes, storyboard: scenes })
        } catch {
          imgMock = true
          anyMock = true
          noteMissing('images')
        }
      }

      set({ directingSceneLabel: null })

      setStep(set, get, 'voice')
      let voiceUrl: string | null = null
      let waveform: number[] = []

      const voiceRes = await fetch('/api/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      })
      const voiceData = (await voiceRes.json()) as Record<string, unknown>
      if (voiceRes.ok) {
        voiceUrl = typeof voiceData.audioUrl === 'string' ? voiceData.audioUrl : null
        waveform = Array.isArray(voiceData.waveform)
          ? (voiceData.waveform as number[])
          : []
        if (voiceData.mock === true) {
          anyMock = true
          noteMissing('voice')
        }
      } else {
        anyMock = true
        noteMissing('voice')
      }

      set({ voiceUrl, waveform })

      setStep(set, get, 'render')
      let videoUrl: string | null = null
      let renderPollUrl: string | null = null
      let renderError: string | null = null
      let exportPackageReady = false

      try {
        await ensureProjectArchived(get())
      } catch (err) {
        useQuickCutGenerationStore.setState({
          saveState: 'error',
          saveError: resolveSaveError(err),
        })
      }

      if (videoRenderEnabled) {
        try {
          const { renderRes, renderData } = await requestVideoRender(get(), true)

          if (renderRes.ok) {
            if (typeof renderData.videoUrl === 'string' && renderData.videoUrl) {
              videoUrl = renderData.videoUrl
              set({ videoUrl, renderPollUrl: null, renderError: null })
            } else if (typeof renderData.pollUrl === 'string') {
              renderPollUrl = renderData.pollUrl
              set({ renderPollUrl, renderError: null })
              try {
                videoUrl = await pollRenderJob(renderPollUrl, (patch) => {
                  if (patch.label) set({ renderStatusLabel: patch.label })
                  if (patch.videoUrl) {
                    set({ videoUrl: patch.videoUrl, renderPollUrl: null, renderError: null })
                  }
                })
              } catch (pollErr) {
                renderError =
                  pollErr instanceof Error ? pollErr.message : 'Video render timed out'
              }
            }
            if (renderData.mock === true) anyMock = true
          } else {
            renderError = String(renderData?.error || 'Video render unavailable')
            anyMock = true
            noteMissing('video')
          }
        } catch (renderErr) {
          renderError =
            renderErr instanceof Error ? renderErr.message : 'Video render unavailable'
          anyMock = true
          noteMissing('video')
        }
      } else {
        try {
          await simulateMockExport((label) => set({ renderStatusLabel: label }))
          exportPackageReady = true
        } catch (mockErr) {
          exportPackageReady = false
          renderError =
            mockErr instanceof Error ? mockErr.message : 'Storyboard export packaging failed'
        }
      }

      const pipeline: QuickCutPipelineStatus = {
        steps: {
          script: scriptData.mock === true ? 'fallback' : 'live',
          images: imgMock ? 'fallback' : 'live',
          voice: voiceUrl ? 'live' : 'fallback',
          video: videoRenderEnabled ? (videoUrl ? 'live' : 'skipped') : 'skipped',
        },
        missingKeys: [...missingKeys],
        live: !anyMock,
      }

      setStep(set, get, 'complete')
      set({
        videoUrl,
        renderPollUrl: videoUrl ? null : renderPollUrl,
        renderError: videoUrl ? null : renderError,
        exportPackageReady,
        mock: anyMock,
        missingKeys: [...missingKeys],
        pipeline,
        isGenerating: false,
        isComplete: true,
        progress: 100,
        eta: 0,
      })

      persistSession(get())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation paused — try again.'
      set({
        error: message,
        generationStep: 'error',
        isGenerating: false,
        isComplete: false,
      })
    }
  },

  regenerateSceneImage: async (sceneId) => {
    const state = get()
    if (!sceneId || state.isGenerating) return
    if (!state.scenes.some((s) => s.id === sceneId)) return

    set({
      regeneratingSceneIds: [...state.regeneratingSceneIds, sceneId],
      directingSceneLabel: 'Composing visuals…',
    })

    try {
      const result = await fetchSceneImages(state, [sceneId])
      const scenes = mergeScenesById(state.scenes, result.scenes, [sceneId])
      set({
        scenes,
        storyboard: scenes,
        characterDescription:
          result.characterDescription || state.characterDescription,
      })
      persistSession(get())
    } catch {
      /* silent — card shows prior frame */
    } finally {
      set({
        regeneratingSceneIds: get().regeneratingSceneIds.filter((id) => id !== sceneId),
        directingSceneLabel: null,
      })
    }
  },

  updateSceneImagePrompt: async (sceneId, imagePrompt) => {
    const state = get()
    const idx = state.scenes.findIndex((s) => s.id === sceneId)
    if (idx < 0) return

    const scenes = [...state.scenes]
    scenes[idx] = ensureScenesHaveImagePrompts([
      { ...scenes[idx], imagePrompt: imagePrompt.trim() },
    ])[0]
    set({ scenes, storyboard: scenes })
    await get().regenerateSceneImage(sceneId)
  },

  generateSceneVariations: async (sceneId) => {
    const state = get()
    if (!sceneId || state.isGenerating) return
    if (!state.scenes.some((s) => s.id === sceneId)) return

    set({
      regeneratingSceneIds: [...state.regeneratingSceneIds, sceneId],
      directingSceneLabel: 'Composing variation…',
    })

    try {
      const result = await fetchSceneImages(state, [sceneId], true)
      const scenes = mergeScenesById(state.scenes, result.scenes, [sceneId])
      set({ scenes, storyboard: scenes })
      persistSession(get())
    } catch {
      /* keep primary frame */
    } finally {
      set({
        regeneratingSceneIds: get().regeneratingSceneIds.filter((id) => id !== sceneId),
        directingSceneLabel: null,
      })
    }
  },

  regenerateHook: async () => {
    const state = get()
    if (!state.hook.trim() || state.isRegeneratingHook || state.isGenerating) return

    set({
      isRegeneratingHook: true,
      activeStageTab: 'hook',
      stageTabPinned: true,
    })

    try {
      const priorHooks = state.previousHooks
      const currentHook = state.hook
      const avoid = [...priorHooks, currentHook]

      let result = await requestHookRegeneration(state, false)

      if (isHookTooSimilar(result.hook, avoid)) {
        result = await requestHookRegeneration(
          { ...state, previousHooks: priorHooks },
          true
        )
      }

      const nextPrevious = appendPreviousHook(priorHooks, currentHook)
      const hookVariantNumber =
        result.hookVariantNumber ?? state.hookVariantNumber + 1
      const nextVirlo =
        result.virlo && state.virlo
          ? { ...state.virlo, ...result.virlo, hookVariant: `v${hookVariantNumber}` }
          : state.virlo
            ? { ...state.virlo, hookVariant: `v${hookVariantNumber}` }
            : result.virlo ?? null

      set({
        hook: result.hook,
        previousHooks: nextPrevious,
        hookVariantNumber,
        virlo: nextVirlo,
      })

      persistSession(get())
    } catch {
      /* hook regen is non-blocking — user keeps current hook */
    } finally {
      set({ isRegeneratingHook: false })
    }
  },

  retryVideoRender: async () => {
    const state = get()
    if (state.videoUrl || state.scenes.length < 1 || state.isGenerating) return

    if (!state.videoRenderEnabled) {
      set({ renderError: null, exportPackageReady: false })
      try {
        await simulateMockExport((label) => set({ renderStatusLabel: label }))
        set({ exportPackageReady: true, renderError: null })
        persistSession(get())
      } catch (mockErr) {
        set({
          exportPackageReady: false,
          renderError:
            mockErr instanceof Error ? mockErr.message : 'Storyboard export packaging failed',
        })
      }
      return
    }

    set({ renderError: null })

    try {
      try {
        await ensureProjectArchived(get())
      } catch (err) {
        useQuickCutGenerationStore.setState({
          saveState: 'error',
          saveError: resolveSaveError(err),
        })
      }

      const { renderRes, renderData } = await requestVideoRender(get(), true)
      if (!renderRes.ok) {
        set({ renderError: String(renderData?.error || 'Video render unavailable') })
        return
      }

      if (typeof renderData.videoUrl === 'string' && renderData.videoUrl) {
        set({ videoUrl: renderData.videoUrl, renderPollUrl: null, renderError: null })
        persistSession(get())
        return
      }

      if (typeof renderData.pollUrl === 'string') {
        set({ renderPollUrl: renderData.pollUrl, renderError: null })
        await get().resumeRenderPoll()
        return
      }

      const sync = await requestVideoRender(state, false)
      if (sync.renderRes.ok && typeof sync.renderData.videoUrl === 'string') {
        set({
          videoUrl: sync.renderData.videoUrl,
          renderPollUrl: null,
          renderError: null,
        })
        persistSession(get())
        return
      }

      set({ renderError: String(sync.renderData?.error || 'Video render unavailable') })
    } catch (err) {
      set({
        renderError: err instanceof Error ? err.message : 'Video render unavailable',
      })
    }
  },

  resumeRenderPoll: async () => {
    const { renderPollUrl, videoUrl, videoRenderEnabled } = get()
    if (!videoRenderEnabled || !renderPollUrl || videoUrl) return

    try {
      const url = await pollRenderJob(
        renderPollUrl,
        (patch) => {
          if (patch.label) set({ renderStatusLabel: patch.label })
          if (patch.videoUrl) {
            set({ videoUrl: patch.videoUrl, renderPollUrl: null, renderError: null })
          }
        },
        240
      )
      set({ videoUrl: url, renderPollUrl: null, renderError: null })
      persistSession(get())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Video render timed out'
      set({ renderError: message, renderPollUrl: null })
      persistSession(get())
    }
  },

  saveProject: async () => {
    const state = get()
    if (state.saveState === 'saving') return state.savedProjectId
    if (!state.script && state.scenes.length < 1) return null

    set({ saveState: 'saving', saveError: null })
    try {
      const id = await archiveQuickCutProject(get())
      return id
    } catch (err) {
      set({ saveState: 'error', saveError: resolveSaveError(err) })
      return null
    }
  },
}))
