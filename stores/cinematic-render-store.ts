'use client'

import { create } from 'zustand'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export type RenderBuildStage = 1 | 2 | 3 | 4 | 5 | 6

export type RenderMilestoneId =
  | 'analyzing'
  | 'hook'
  | 'script'
  | 'visuals'
  | 'scenes'
  | 'voiceover'
  | 'transitions'
  | 'export'
  | 'complete'

export type PipelineStepStatus = 'pending' | 'active' | 'complete'

export interface RenderMilestone {
  id: RenderMilestoneId
  percent: number
  label: string
  stage: RenderBuildStage
}

export const RENDER_MILESTONES: RenderMilestone[] = [
  { id: 'analyzing', percent: 0, label: 'Analyzing story', stage: 1 },
  { id: 'hook', percent: 15, label: 'Generating hook', stage: 1 },
  { id: 'script', percent: 30, label: 'Building cinematic script', stage: 2 },
  { id: 'visuals', percent: 45, label: 'Generating visuals', stage: 2 },
  { id: 'scenes', percent: 60, label: 'Rendering scenes', stage: 3 },
  { id: 'voiceover', percent: 75, label: 'Generating voiceover', stage: 4 },
  { id: 'transitions', percent: 88, label: 'Compiling transitions', stage: 5 },
  { id: 'export', percent: 96, label: 'Final cinematic export', stage: 6 },
  { id: 'complete', percent: 100, label: 'Video ready', stage: 6 },
]

export const STAGE_LABELS: Record<RenderBuildStage, string> = {
  1: 'Storyboard',
  2: 'Visuals',
  3: 'Subtitles',
  4: 'Waveform',
  5: 'Transitions',
  6: 'Final export',
}

export const DETAIL_LABELS = [
  'Calibrating emotional pacing…',
  'Matching cinematic rhythm…',
  'Balancing visual atmosphere…',
  'Rendering subtitle layers…',
  'Applying motion stabilization…',
  'Running cinematic color grading…',
  'Aligning voice-to-visual sync…',
  'Polishing scene transitions…',
] as const

export interface RenderPipelineStep {
  id: RenderMilestoneId
  label: string
  status: PipelineStepStatus
}

function milestoneFromPercent(percent: number): RenderMilestone {
  let current = RENDER_MILESTONES[0]
  for (const m of RENDER_MILESTONES) {
    if (percent >= m.percent) current = m
  }
  return current
}

function buildPipelineSteps(activeId: RenderMilestoneId): RenderPipelineStep[] {
  const activeIndex = RENDER_MILESTONES.findIndex((m) => m.id === activeId)
  return RENDER_MILESTONES.filter((m) => m.id !== 'complete').map((m, i) => ({
    id: m.id,
    label: m.label,
    status:
      i < activeIndex
        ? 'complete'
        : i === activeIndex
          ? 'active'
          : 'pending',
  }))
}

export interface CinematicRenderState {
  progress: number
  activeMilestone: RenderMilestoneId
  activeStepLabel: string
  buildStage: RenderBuildStage
  etaSeconds: number
  detailLabel: string
  detailLabelIndex: number
  completedSceneIndices: number[]
  livePreviewFrames: string[]
  generatedScenes: GeneratedScene[]
  pipelineSteps: RenderPipelineStep[]
  videoUrl: string | null
  isRendering: boolean
  isComplete: boolean
  showSubtitles: boolean
  showWaveform: boolean
  showTransitions: boolean
  error: string | null
  mode: 'idle' | 'simulation' | 'api'
}

interface CinematicRenderActions {
  reset: () => void
  initFromProject: (input: {
    title: string
    hook: string
    duration: number
    style?: string
    scenes: GeneratedScene[]
    previewFrames: string[]
    videoUrl?: string | null
  }) => void
  setProgress: (percent: number, opts?: { label?: string }) => void
  setDetailLabelIndex: (index: number) => void
  markSceneComplete: (index: number) => void
  revealPreviewFrame: (index: number, url: string) => void
  setBuildStage: (stage: RenderBuildStage) => void
  setVideoUrl: (url: string) => void
  setRendering: (rendering: boolean) => void
  setError: (error: string | null) => void
  setMode: (mode: CinematicRenderState['mode']) => void
  complete: (videoUrl?: string | null) => void
  syncFromApiJob: (job: {
    percent?: number
    label?: string
    videoUrl?: string | null
    status?: string
  }) => void
}

const INITIAL: CinematicRenderState = {
  progress: 0,
  activeMilestone: 'analyzing',
  activeStepLabel: RENDER_MILESTONES[0].label,
  buildStage: 1,
  etaSeconds: 0,
  detailLabel: DETAIL_LABELS[0],
  detailLabelIndex: 0,
  completedSceneIndices: [],
  livePreviewFrames: [],
  generatedScenes: [],
  pipelineSteps: buildPipelineSteps('analyzing'),
  videoUrl: null,
  isRendering: false,
  isComplete: false,
  showSubtitles: false,
  showWaveform: false,
  showTransitions: false,
  error: null,
  mode: 'idle',
}

function applyProgress(
  state: CinematicRenderState,
  percent: number,
  label?: string
): Partial<CinematicRenderState> {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)))
  const milestone = milestoneFromPercent(clamped)
  const stage = milestone.stage
  return {
    progress: clamped,
    activeMilestone: milestone.id,
    activeStepLabel: label ?? milestone.label,
    buildStage: stage,
    pipelineSteps: buildPipelineSteps(milestone.id),
    showSubtitles: stage >= 3,
    showWaveform: stage >= 4,
    showTransitions: stage >= 5,
    etaSeconds: clamped >= 100 ? 0 : Math.max(0, Math.round((100 - clamped) * 0.55)),
    isComplete: clamped >= 100,
  }
}

export const useCinematicRenderStore = create<
  CinematicRenderState & CinematicRenderActions
>((set, get) => ({
  ...INITIAL,

  reset: () => set({ ...INITIAL, pipelineSteps: buildPipelineSteps('analyzing') }),

  initFromProject: (input) => {
    if (input.videoUrl) {
      set({
        ...INITIAL,
        generatedScenes: input.scenes,
        livePreviewFrames: input.previewFrames,
        videoUrl: input.videoUrl,
        ...applyProgress({ ...INITIAL }, 100),
        isRendering: false,
        isComplete: true,
      })
      return
    }
    set({
      ...INITIAL,
      generatedScenes: input.scenes,
      livePreviewFrames: input.previewFrames.length
        ? input.previewFrames.map(() => '')
        : input.scenes.map(() => ''),
      pipelineSteps: buildPipelineSteps('analyzing'),
    })
  },

  setProgress: (percent, opts) =>
    set((state) => ({
      ...state,
      ...applyProgress(state, percent, opts?.label),
    })),

  setDetailLabelIndex: (index) =>
    set({
      detailLabelIndex: index,
      detailLabel: DETAIL_LABELS[index % DETAIL_LABELS.length],
    }),

  markSceneComplete: (index) =>
    set((state) => ({
      completedSceneIndices: state.completedSceneIndices.includes(index)
        ? state.completedSceneIndices
        : [...state.completedSceneIndices, index],
    })),

  revealPreviewFrame: (index, url) =>
    set((state) => {
      const frames = [...state.livePreviewFrames]
      while (frames.length <= index) frames.push('')
      frames[index] = url
      return { livePreviewFrames: frames }
    }),

  setBuildStage: (stage) => set({ buildStage: stage }),

  setVideoUrl: (url) => set({ videoUrl: url }),

  setRendering: (isRendering) => set({ isRendering }),

  setError: (error) => set({ error, isRendering: false }),

  setMode: (mode) => set({ mode }),

  complete: (videoUrl) =>
    set((state) => ({
      ...state,
      ...applyProgress(state, 100),
      videoUrl: videoUrl ?? state.videoUrl,
      isRendering: false,
      isComplete: true,
    })),

  syncFromApiJob: (job) => {
    const apiPercent =
      typeof job.percent === 'number'
        ? Math.min(99, 88 + Math.round(job.percent * 0.11))
        : get().progress
    const patch = applyProgress(get(), apiPercent, job.label)
    set({
      ...patch,
      mode: 'api',
      videoUrl:
        typeof job.videoUrl === 'string' && job.videoUrl
          ? job.videoUrl
          : get().videoUrl,
    })
  },
}))

export { milestoneFromPercent, buildPipelineSteps }
