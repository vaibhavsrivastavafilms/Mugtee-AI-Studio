'use client'

import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import { QUICK_CUT_V2_TEXT_TO_VIDEO } from '@/lib/quick-cut/quick-cut-v2-config'

export type GenerationActivityEntry = {
  id: string
  label: string
  status: 'completed' | 'current'
  at: number
}

const ACTIVITY_KEY = 'mugtee:generation-activity:v1'

function readLog(): GenerationActivityEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(ACTIVITY_KEY)
    return raw ? (JSON.parse(raw) as GenerationActivityEntry[]) : []
  } catch {
    return []
  }
}

function writeLog(entries: GenerationActivityEntry[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(entries.slice(-24)))
  } catch {
    /* quota */
  }
}

export function clearGenerationActivityLog(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(ACTIVITY_KEY)
  } catch {
    /* ignore */
  }
}

export function appendGenerationActivity(entry: Omit<GenerationActivityEntry, 'at'> & { at?: number }) {
  const log = readLog()
  const at = entry.at ?? Date.now()
  const existing = log.find((e) => e.id === entry.id && e.status === entry.status)
  if (existing && entry.status === 'completed') return
  const filtered = log.filter((e) => !(e.id === entry.id && e.status === 'current'))
  filtered.push({ ...entry, at })
  writeLog(filtered)
}

export function getGenerationActivityLog(): GenerationActivityEntry[] {
  return readLog()
}

/** mm:ss elapsed from pipeline start. */
export function formatActivityElapsed(at: number, startedAt: number | null): string {
  if (!startedAt) return '--:--'
  const elapsed = Math.max(0, at - startedAt)
  const m = Math.floor(elapsed / 60_000)
  const s = Math.floor((elapsed % 60_000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type ActivitySyncInput = {
  sectionStatus: SectionStatusMap
  generationStep: QuickCutGenerationStep
  scenes: GeneratedScene[]
  hook: string
  script: string
  voiceUrl: string | null
  generationStartedAt: number | null
  isRenderingVideo?: boolean
  pipelineStatus?: string
}

/** Sync activity log from real pipeline state — human-readable, no technical logs. */
export function syncGenerationActivityFromState(input: ActivitySyncInput): GenerationActivityEntry[] {
  const now = Date.now()
  const started = input.generationStartedAt ?? now

  if (input.generationStep === 'analyzing' || input.sectionStatus.contentDirectorBrief === 'generating') {
    appendGenerationActivity({ id: 'topic', label: 'Finding the best opening...', status: 'current', at: now })
  } else if (input.sectionStatus.contentDirectorBrief === 'completed') {
    appendGenerationActivity({ id: 'topic', label: 'The opening spark is ready', status: 'completed', at: started })
  }

  if (input.hook.trim() || input.sectionStatus.hook === 'completed') {
    if (input.sectionStatus.hook === 'generating') {
      appendGenerationActivity({ id: 'hook', label: 'Shaping the hook...', status: 'current', at: now })
    } else if (input.sectionStatus.hook === 'completed' || input.hook.trim()) {
      appendGenerationActivity({ id: 'hook', label: 'The hook is ready', status: 'completed', at: now })
    }
  }

  if (input.script.trim() || input.sectionStatus.script === 'completed') {
    if (input.sectionStatus.script === 'generating') {
      appendGenerationActivity({ id: 'script', label: 'Writing the story with you...', status: 'current', at: now })
    } else if (input.sectionStatus.script === 'completed' || input.script.trim()) {
      appendGenerationActivity({ id: 'script', label: 'The story has a shape', status: 'completed', at: now })
    }
  }

  if (input.scenes.length > 0 || input.sectionStatus.visualDirection === 'completed') {
    if (input.sectionStatus.visualDirection === 'generating') {
      appendGenerationActivity({ id: 'scenes', label: 'Planning camera moments...', status: 'current', at: now })
    } else if (input.sectionStatus.visualDirection === 'completed' || input.scenes.length > 0) {
      appendGenerationActivity({
        id: 'scenes',
        label: 'The scene rhythm is mapped',
        status: 'completed',
        at: now,
      })
    }
  }

  const imageCount = input.scenes.length
  const completedVideos = input.scenes.filter((s) => s.videoUrl?.trim()).length
  const completedFrames = input.scenes.filter((s) =>
    Boolean(s.imageUrl?.trim() || s.imageAssetPath?.trim())
  ).length

  if (
    input.sectionStatus.storyboard === 'generating' ||
    input.generationStep === 'images' ||
    (QUICK_CUT_V2_TEXT_TO_VIDEO && completedFrames < imageCount)
  ) {
    const sceneN = Math.max(1, Math.min(imageCount, completedFrames + 1))
    if (imageCount > 0) {
      appendGenerationActivity({
        id: `storyboard-${sceneN}`,
        label: `Painting scene ${sceneN} of ${imageCount}...`,
        status: completedFrames >= imageCount ? 'completed' : 'current',
        at: now,
      })
    }
  } else if (input.sectionStatus.storyboard === 'completed' || completedFrames >= imageCount) {
    appendGenerationActivity({
      id: 'storyboard',
      label: 'The visual world is ready',
      status: 'completed',
      at: now,
    })
  }

  if (
    QUICK_CUT_V2_TEXT_TO_VIDEO &&
    (input.generationStep === 'motion' || completedVideos < imageCount)
  ) {
    const sceneN = Math.min(imageCount, Math.max(1, completedVideos + 1))
    if (imageCount > 0 && completedFrames >= imageCount) {
      appendGenerationActivity({
        id: `video-${sceneN}`,
        label: `Giving scene ${sceneN} movement...`,
        status: completedVideos >= imageCount ? 'completed' : 'current',
        at: now,
      })
    }
  }

  if (input.voiceUrl || input.sectionStatus.voice === 'completed') {
    if (input.sectionStatus.voice === 'generating') {
      appendGenerationActivity({ id: 'voice', label: 'Listening for the rhythm...', status: 'current', at: now })
    } else if (input.sectionStatus.voice === 'completed' || input.voiceUrl) {
      appendGenerationActivity({ id: 'voice', label: 'The narration is ready', status: 'completed', at: now })
    }
  }

  if (input.sectionStatus.captions === 'generating') {
    appendGenerationActivity({ id: 'captions', label: 'Making the words easy to follow...', status: 'current', at: now })
  } else if (input.sectionStatus.captions === 'completed') {
    appendGenerationActivity({ id: 'captions', label: 'The words are placed', status: 'completed', at: now })
  }

  if (input.sectionStatus.export === 'generating' || input.generationStep === 'render' || input.isRenderingVideo) {
    appendGenerationActivity({
      id: 'export',
      label: input.isRenderingVideo ? 'Building your timeline...' : 'Wrapping everything together...',
      status: 'current',
      at: now,
    })
  } else if (input.sectionStatus.export === 'completed' || input.pipelineStatus === 'mp4_complete') {
    appendGenerationActivity({ id: 'export', label: 'Your reel is ready to share', status: 'completed', at: now })
  }

  return getGenerationActivityLog()
}
