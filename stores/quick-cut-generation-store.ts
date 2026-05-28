'use client'

import { create } from 'zustand'
import {
  ensureScenesHaveImagePrompts,
  type GeneratedScene,
} from '@/lib/cinematic/generation'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import { applyGenerationToStore } from '@/stores/cinematic-project'
import { saveQuickCutPreview } from '@/lib/cinematic/quick-cut/preview-session'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { scenesToStore } from '@/lib/cinematic/generation'
import { archiveGeneratedProject } from '@/lib/cinematic-projects'
import type { QuickCutPipelineStatus } from '@/lib/cinematic/quick-cut/pipeline-status'
import { buildEmotionalPreviewRhythm, mergePreviewRhythm } from '@/lib/cinematic/preview/emotional-preview-rhythm'
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
  render: 'Rendering subtitles & compiling MP4…',
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

interface QuickCutGenerationState {
  generationStep: QuickCutGenerationStep
  activeStageTab: QuickCutStageTab
  stageTabPinned: boolean
  prompt: string
  title: string
  hook: string
  script: string
  scenes: GeneratedScene[]
  storyboard: GeneratedScene[]
  voiceUrl: string | null
  waveform: number[]
  progress: number
  eta: number
  videoUrl: string | null
  renderPollUrl: string | null
  renderError: string | null
  renderStatusLabel: string | null
  virlo: VirloMetadata | null
  mock: boolean
  missingKeys: string[]
  pipeline: QuickCutPipelineStatus | null
  error: string | null
  isGenerating: boolean
  isComplete: boolean
}

interface QuickCutGenerationActions {
  reset: () => void
  setActiveStageTab: (tab: QuickCutStageTab, pinned?: boolean) => void
  followPipelineStage: () => void
  runPipeline: (input: QuickCutInput) => Promise<void>
  retryVideoRender: () => Promise<void>
  resumeRenderPoll: () => Promise<void>
}

const INITIAL: QuickCutGenerationState = {
  generationStep: 'idle',
  activeStageTab: 'title',
  stageTabPinned: false,
  prompt: '',
  title: '',
  hook: '',
  script: '',
  scenes: [],
  storyboard: [],
  voiceUrl: null,
  waveform: [],
  progress: 0,
  eta: 14,
  videoUrl: null,
  renderPollUrl: null,
  renderError: null,
  renderStatusLabel: null,
  virlo: null,
  mock: false,
  missingKeys: [],
  pipeline: null,
  error: null,
  isGenerating: false,
  isComplete: false,
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
    }),
  })
  const renderData = (await renderRes.json()) as Record<string, unknown>
  return { renderRes, renderData }
}

function persistSession(state: QuickCutGenerationState) {
  const output: CinematicGenerationOutput = {
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

  const storedScenes = scenesToStore(output.scenes)
  const thumbnail =
    storedScenes[0]?.imageUrl?.trim() ??
    storedScenes.find((s) => s.imageUrl)?.imageUrl ??
    storedScenes[0]?.storyboardImages?.[0]?.url ??
    null

  void archiveGeneratedProject({
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
  })
}

export const useQuickCutGenerationStore = create<
  QuickCutGenerationState & QuickCutGenerationActions
>((set, get) => ({
  ...INITIAL,

  reset: () => set({ ...INITIAL }),

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

    const noteMissing = (step: 'script' | 'images' | 'voice' | 'video') => {
      if (step === 'script' && !config.openai) missingKeys.add('OPENAI_API_KEY')
      if (step === 'images' && !config.images) {
        if (!config.openai) missingKeys.add('OPENAI_API_KEY')
        if (!config.emergent) missingKeys.add('EMERGENT_LLM_KEY')
      }
      if (step === 'voice' && !config.elevenlabs && !config.openai && !config.emergent) {
        missingKeys.add('ELEVENLABS_API_KEY')
        missingKeys.add('OPENAI_API_KEY')
      }
      if (step === 'video' && !config.ffmpeg) missingKeys.add('FFMPEG_PATH')
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
      set({ title, hook, virlo, storyboard: [] })

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

      set({
        script,
        title: scriptTitle,
        hook: scriptHook,
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

      set({ scenes, storyboard: scenes })

      setStep(set, get, 'images')
      let imgMock = true
      const imgRes = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes }),
      })
      const imgData = (await imgRes.json()) as Record<string, unknown>
      if (imgRes.ok && Array.isArray(imgData.scenes)) {
        scenes = ensureScenesHaveImagePrompts(imgData.scenes as GeneratedScene[])
        imgMock = imgData.mock === true
        if (imgMock) {
          anyMock = true
          noteMissing('images')
        }
        set({ scenes, storyboard: scenes })
      } else {
        anyMock = true
        noteMissing('images')
        set({ scenes, storyboard: scenes })
      }

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
              /* Export screen resumes polling via renderPollUrl */
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

      const pipeline: QuickCutPipelineStatus = {
        steps: {
          script: scriptData.mock === true ? 'fallback' : 'live',
          images: imgMock ? 'fallback' : 'live',
          voice: voiceUrl ? 'live' : 'fallback',
          video: videoUrl ? 'live' : 'skipped',
        },
        missingKeys: [...missingKeys],
        live: !anyMock,
      }

      setStep(set, get, 'complete')
      set({
        videoUrl,
        renderPollUrl: videoUrl ? null : renderPollUrl,
        renderError: videoUrl ? null : renderError,
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

  retryVideoRender: async () => {
    const state = get()
    if (state.videoUrl || state.scenes.length < 1 || state.isGenerating) return

    set({ renderError: null })

    try {
      const { renderRes, renderData } = await requestVideoRender(state, true)
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
    const { renderPollUrl, videoUrl } = get()
    if (!renderPollUrl || videoUrl) return

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
}))
