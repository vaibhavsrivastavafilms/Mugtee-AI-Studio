'use client'

import { create } from 'zustand'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export type WorkflowStep =
  | 'idle'
  | 'idea'
  | 'title'
  | 'script'
  | 'scenes'
  | 'voice'
  | 'video'
  | 'complete'

export type GenerationPhase =
  | 'idle'
  | 'analyzing'
  | 'title'
  | 'script'
  | 'scenes'
  | 'visuals'
  | 'voice'
  | 'video'
  | 'complete'

export type RenderStatus = 'idle' | 'rendering' | 'done'

export interface CinematicWorkflowOutputs {
  title: string
  hook: string
  script: string
  scenes: GeneratedScene[]
  voiceUrl: string | null
  waveform: number[]
  videoUrl: string | null
}

export interface PhaseConfig {
  percent: number
  label: string
  secondsRemaining: number
}

export const PHASE_CONFIG: Record<GenerationPhase, PhaseConfig> = {
  idle: { percent: 0, label: '', secondsRemaining: 0 },
  analyzing: { percent: 10, label: 'Analyzing Idea...', secondsRemaining: 14 },
  title: { percent: 20, label: 'Generating Viral Title...', secondsRemaining: 12 },
  script: { percent: 35, label: 'Writing Cinematic Script...', secondsRemaining: 10 },
  scenes: { percent: 50, label: 'Creating Scene Directions...', secondsRemaining: 8 },
  visuals: { percent: 65, label: 'Generating Faceless Visuals...', secondsRemaining: 6 },
  voice: { percent: 80, label: 'Generating Voiceover...', secondsRemaining: 4 },
  video: { percent: 92, label: 'Compiling Cinematic Video...', secondsRemaining: 2 },
  complete: { percent: 100, label: 'Your Cinematic Video Is Ready', secondsRemaining: 0 },
}

export const GENERATION_PHASE_ORDER: GenerationPhase[] = [
  'analyzing',
  'title',
  'script',
  'scenes',
  'visuals',
  'voice',
  'video',
  'complete',
]

interface CinematicWorkflowState {
  idea: string
  currentStep: WorkflowStep
  completedSteps: WorkflowStep[]
  loading: boolean
  exportProgress: number
  outputs: CinematicWorkflowOutputs
  error: string | null
  isPanelOpen: boolean
  isGenerating: boolean
  isComplete: boolean
  generationPhase: GenerationPhase
  progressPercent: number
  currentStepLabel: string
  estimatedSecondsRemaining: number
  renderStatus: RenderStatus
}

interface CinematicWorkflowActions {
  setIdea: (idea: string) => void
  setStep: (step: WorkflowStep) => void
  markStepComplete: (step: WorkflowStep) => void
  setLoading: (loading: boolean) => void
  setExportProgress: (progress: number) => void
  setOutputs: (patch: Partial<CinematicWorkflowOutputs>) => void
  setError: (error: string | null) => void
  openGenerationPanel: () => void
  closeGenerationPanel: () => void
  setGenerationPhase: (phase: GenerationPhase) => void
  resetWorkflow: () => void
  runMockPipeline: (idea: string) => Promise<void>
  /** Same pipeline as runMockPipeline — real APIs when keys are configured. */
  runPipeline: (idea: string) => Promise<void>
}

const EMPTY_OUTPUTS: CinematicWorkflowOutputs = {
  title: '',
  hook: '',
  script: '',
  scenes: [],
  voiceUrl: null,
  waveform: [],
  videoUrl: null,
}

const DEMO_OUTPUTS: CinematicWorkflowOutputs = {
  title: 'Your Brain Is Being Hijacked',
  hook: '"Every scroll rewires a circuit you didn\'t know you had."',
  script:
    'Scene 1 · [0:00]\nVisual: Close-up of thumb hovering over a glowing feed.\nVoiceover: "Your brain treats novelty like survival."\n\nScene 2 · [0:04]\nVisual: Neural pathways light up in gold against black.\nVoiceover: "Dopamine isn\'t pleasure — it\'s the promise of more."',
  scenes: [
    {
      id: 'scene-1',
      title: 'Pattern interrupt',
      description: 'Thumb frozen mid-scroll. Feed glow bleeds into darkness.',
      duration: 4,
      visualPrompt: 'macro phone screen, shallow DOF',
      imagePrompt:
        'Thumb frozen mid-scroll on glowing feed. macro phone screen, shallow DOF. Close-up · Cool blue screen glow · Midnight blue, gold accent · Static hold',
      cameraAngle: 'Close-up',
      lightingMood: 'Cool blue screen glow',
      environment: 'Dark room',
      colorPalette: 'Midnight blue, gold accent',
      movementStyle: 'Static hold',
    },
    {
      id: 'scene-2',
      title: 'Neural reveal',
      description: 'Golden neural pathways pulse against void black.',
      duration: 5,
      visualPrompt: 'abstract brain circuitry, cinematic',
      imagePrompt:
        'Golden neural pathways pulse against void black. abstract brain circuitry, cinematic. Slow push-in · Warm gold rim · Black, gold, amber · Dolly in',
      cameraAngle: 'Slow push-in',
      lightingMood: 'Warm gold rim',
      environment: 'Abstract void',
      colorPalette: 'Black, gold, amber',
      movementStyle: 'Dolly in',
    },
    {
      id: 'scene-3',
      title: 'Emotional peak',
      description: 'Eyes reflect infinite feed loop — the trap made visible.',
      duration: 4,
      visualPrompt: 'eye reflection of scrolling feed',
      imagePrompt:
        'Eyes reflect infinite feed loop. eye reflection of scrolling feed. Extreme close-up · High contrast · Deep shadow, gold highlight · Subtle drift',
      cameraAngle: 'Extreme close-up',
      lightingMood: 'High contrast',
      environment: 'Silhouette',
      colorPalette: 'Deep shadow, gold highlight',
      movementStyle: 'Subtle drift',
    },
  ],
  voiceUrl: null,
  waveform: [0.2, 0.45, 0.7, 0.55, 0.85, 0.6, 0.75, 0.4, 0.65, 0.5, 0.8, 0.35],
  videoUrl: null,
}

const INITIAL_STATE: CinematicWorkflowState = {
  idea: '',
  currentStep: 'idle',
  completedSteps: [],
  loading: false,
  exportProgress: 0,
  outputs: { ...EMPTY_OUTPUTS },
  error: null,
  isPanelOpen: false,
  isGenerating: false,
  isComplete: false,
  generationPhase: 'idle',
  progressPercent: 0,
  currentStepLabel: '',
  estimatedSecondsRemaining: 0,
  renderStatus: 'idle',
}

const STEP_ORDER: WorkflowStep[] = [
  'idea',
  'title',
  'script',
  'scenes',
  'voice',
  'video',
  'complete',
]

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomDelay(min = 800, max = 1500) {
  return delay(min + Math.floor(Math.random() * (max - min + 1)))
}

function applyPhase(
  set: (patch: Partial<CinematicWorkflowState>) => void,
  phase: GenerationPhase
) {
  const config = PHASE_CONFIG[phase]
  set({
    generationPhase: phase,
    progressPercent: config.percent,
    currentStepLabel: config.label,
    estimatedSecondsRemaining: config.secondsRemaining,
    isComplete: phase === 'complete',
  })
}

async function animateProgress(
  set: (patch: Partial<CinematicWorkflowState>) => void,
  from: number,
  to: number,
  durationMs: number
) {
  const steps = Math.max(8, Math.round(durationMs / 80))
  const stepMs = durationMs / steps
  for (let i = 1; i <= steps; i++) {
    const pct = from + ((to - from) * i) / steps
    set({ progressPercent: Math.round(pct) })
    await delay(stepMs)
  }
}

export const useCinematicWorkflowStore = create<
  CinematicWorkflowState & CinematicWorkflowActions
>((set, get) => ({
  ...INITIAL_STATE,

  setIdea: (idea) => set({ idea }),

  setStep: (step) => set({ currentStep: step }),

  markStepComplete: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),

  setLoading: (loading) => set({ loading, isGenerating: loading }),

  setExportProgress: (exportProgress) => set({ exportProgress }),

  setOutputs: (patch) =>
    set((state) => ({ outputs: { ...state.outputs, ...patch } })),

  setError: (error) => set({ error }),

  openGenerationPanel: () => set({ isPanelOpen: true }),

  closeGenerationPanel: () => set({ isPanelOpen: false }),

  setGenerationPhase: (phase) => applyPhase(set, phase),

  resetWorkflow: () =>
    set({
      ...INITIAL_STATE,
      outputs: { ...EMPTY_OUTPUTS },
    }),

  runMockPipeline: async (idea: string) => {
    return get().runPipeline(idea)
  },

  runPipeline: async (idea: string) => {
    const trimmed = idea.trim()
    if (trimmed.length < 3) return

    set({
      idea: trimmed,
      loading: true,
      isGenerating: true,
      isComplete: false,
      error: null,
      isPanelOpen: true,
      currentStep: 'idea',
      completedSteps: ['idea'],
      exportProgress: 0,
      renderStatus: 'idle',
      outputs: { ...EMPTY_OUTPUTS },
      progressPercent: 0,
    })

    try {
      applyPhase(set, 'analyzing')
      set({ progressPercent: 10 })

      const apiSteps: WorkflowStep[] = ['title', 'script', 'scenes', 'voice', 'video']

      for (const step of apiSteps) {
        const phase = step === 'scenes' ? 'scenes' : (step as GenerationPhase)
        applyPhase(set, phase)
        set({ currentStep: step, progressPercent: PHASE_CONFIG[phase].percent })

        const res = await fetch(getEndpointForStep(step), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildBodyForStep(step, trimmed, get().outputs)),
        })

        const data = (await res.json()) as Record<string, unknown>
        if (!res.ok) throw new Error(String(data?.error || 'Generation paused'))

        applyStepResult(step, data, set, get)
        get().markStepComplete(step)

        if (step === 'scenes') {
          applyPhase(set, 'visuals')
          set({ progressPercent: 65 })
          const imgRes = await fetch('/api/generate-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenes: get().outputs.scenes }),
          })
          const imgData = (await imgRes.json()) as Record<string, unknown>
          if (imgRes.ok && Array.isArray(imgData.scenes)) {
            set({
              outputs: {
                ...get().outputs,
                scenes: imgData.scenes as CinematicWorkflowOutputs['scenes'],
              },
            })
          }
        } else if (step === 'video') {
          await pollRenderJob(data, set, get)
        }
      }

      const videoUrl = get().outputs.videoUrl
      if (!videoUrl) {
        throw new Error(
          'Video compile did not produce an MP4. Check FFmpeg (local dev) or server logs.'
        )
      }

      applyPhase(set, 'complete')
      set({
        currentStep: 'complete',
        loading: false,
        isGenerating: false,
        progressPercent: 100,
        exportProgress: 100,
        renderStatus: 'done',
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Generation paused — try again.'
      set({
        error: message,
        loading: false,
        isGenerating: false,
        currentStep: 'idle',
        generationPhase: 'idle',
        renderStatus: 'idle',
      })
    }
  },
}))

async function pollRenderJob(
  startData: Record<string, unknown>,
  set: (patch: Partial<CinematicWorkflowState>) => void,
  get: () => CinematicWorkflowState & CinematicWorkflowActions
) {
  set({ renderStatus: 'rendering', exportProgress: 0 })
  applyPhase(set, 'video')

  let videoUrl =
    typeof startData.videoUrl === 'string' ? startData.videoUrl : null
  const jobId = typeof startData.jobId === 'string' ? startData.jobId : null
  const pollUrl =
    typeof startData.pollUrl === 'string'
      ? startData.pollUrl
      : jobId
        ? `/api/render-video/status/${jobId}`
        : null

  if (videoUrl) {
    set({
      outputs: { ...get().outputs, videoUrl },
      exportProgress: 100,
      progressPercent: 100,
      renderStatus: 'done',
    })
    return
  }

  if (!pollUrl) {
    throw new Error('Render job did not return a video URL')
  }

  const maxAttempts = 120
  for (let i = 0; i < maxAttempts; i++) {
    await delay(1500)
    const res = await fetch(pollUrl)
    const job = (await res.json()) as Record<string, unknown>
    if (!res.ok) throw new Error(String(job?.error || 'Render status unavailable'))

    const percent = typeof job.percent === 'number' ? job.percent : 0
    set({
      exportProgress: percent,
      progressPercent: Math.min(99, 92 + Math.round(percent * 0.07)),
      currentStepLabel:
        typeof job.label === 'string' ? job.label : PHASE_CONFIG.video.label,
    })

    if (job.status === 'failed') {
      throw new Error(String(job.error || 'Video render failed'))
    }

    if (typeof job.videoUrl === 'string' && job.videoUrl) {
      videoUrl = job.videoUrl
      break
    }

    if (job.status === 'done' && typeof job.videoUrl === 'string') {
      videoUrl = job.videoUrl
      break
    }
  }

  if (!videoUrl) throw new Error('Video render timed out — try again')

  set({
    outputs: { ...get().outputs, videoUrl },
    exportProgress: 100,
    progressPercent: 99,
    renderStatus: 'done',
  })
}

function getEndpointForStep(step: WorkflowStep): string {
  switch (step) {
    case 'title':
      return '/api/generate-title'
    case 'script':
      return '/api/generate-script'
    case 'scenes':
      return '/api/generate-scenes'
    case 'voice':
      return '/api/generate-voice'
    case 'video':
      return '/api/render-video'
    default:
      return '/api/generate-title'
  }
}

function buildBodyForStep(
  step: WorkflowStep,
  idea: string,
  outputs: CinematicWorkflowOutputs
): Record<string, unknown> {
  const sessionSeed = idea
  switch (step) {
    case 'title':
      return { idea, sessionSeed }
    case 'script':
      return {
        idea,
        title: outputs.title,
        hook: outputs.hook,
        topic: idea,
        duration: 60,
        tone: 'cinematic',
        sessionSeed,
      }
    case 'scenes':
      return { idea, script: outputs.script, sessionSeed }
    case 'voice':
      return { script: outputs.script }
    case 'video':
      return {
        idea,
        title: outputs.title,
        script: outputs.script,
        scenes: outputs.scenes,
        voiceUrl: outputs.voiceUrl,
        async: true,
      }
    default:
      return { idea }
  }
}

function applyStepResult(
  step: WorkflowStep,
  data: Record<string, unknown>,
  set: (patch: Partial<CinematicWorkflowState>) => void,
  get: () => CinematicWorkflowState & CinematicWorkflowActions
) {
  switch (step) {
    case 'title':
      set({
        outputs: {
          ...get().outputs,
          title: String(data.title ?? ''),
          hook: String(data.hook ?? ''),
        },
      })
      break
    case 'script': {
      const output = data.output as Record<string, unknown> | undefined
      set({
        outputs: {
          ...get().outputs,
          script: String(output?.script ?? data.script ?? ''),
          hook: String(output?.hook ?? get().outputs.hook),
          title: String(output?.title ?? get().outputs.title),
        },
      })
      break
    }
    case 'scenes':
      set({
        outputs: {
          ...get().outputs,
          scenes: Array.isArray(data.scenes) ? data.scenes : get().outputs.scenes,
        },
      })
      break
    case 'voice':
      set({
        outputs: {
          ...get().outputs,
          voiceUrl: typeof data.audioUrl === 'string' ? data.audioUrl : null,
          waveform: Array.isArray(data.waveform) ? data.waveform : get().outputs.waveform,
        },
      })
      break
    case 'video':
      set({
        outputs: {
          ...get().outputs,
          videoUrl:
            typeof data.videoUrl === 'string'
              ? data.videoUrl
              : get().outputs.videoUrl,
        },
      })
      break
  }
}

export { DEMO_OUTPUTS, STEP_ORDER }
