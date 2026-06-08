'use client'

import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

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
}

/** Sync activity log from real pipeline state — call on each meaningful transition. */
export function syncGenerationActivityFromState(input: ActivitySyncInput): GenerationActivityEntry[] {
  const now = Date.now()
  const started = input.generationStartedAt ?? now

  if (input.hook.trim() || input.sectionStatus.hook === 'completed') {
    if (input.sectionStatus.hook === 'generating') {
      appendGenerationActivity({ id: 'hook', label: 'Hook Generated', status: 'current', at: now })
    } else if (input.sectionStatus.hook === 'completed' || input.hook.trim()) {
      appendGenerationActivity({ id: 'hook', label: 'Hook Generated', status: 'completed', at: now })
    }
  }

  if (input.script.trim() || input.sectionStatus.script === 'completed') {
    if (input.sectionStatus.script === 'generating') {
      appendGenerationActivity({ id: 'script', label: 'Script Generated', status: 'current', at: now })
    } else if (input.sectionStatus.script === 'completed' || input.script.trim()) {
      appendGenerationActivity({ id: 'script', label: 'Script Generated', status: 'completed', at: now })
    }
  }

  if (input.scenes.length > 0 || input.sectionStatus.visualDirection === 'completed') {
    if (input.sectionStatus.visualDirection === 'generating') {
      appendGenerationActivity({ id: 'scenes', label: 'Scenes Generated', status: 'current', at: now })
    } else if (input.sectionStatus.visualDirection === 'completed' || input.scenes.length > 0) {
      appendGenerationActivity({ id: 'scenes', label: 'Scenes Generated', status: 'completed', at: now })
    }
  }

  const completedFrames = input.scenes.filter((s) => s.imageUrl?.trim()).length
  if (input.sectionStatus.storyboard === 'generating' || input.generationStep === 'images') {
    const sceneN = Math.max(1, completedFrames + 1)
    appendGenerationActivity({
      id: `storyboard-${sceneN}`,
      label: `Storyboard Scene ${sceneN}`,
      status: 'current',
      at: now,
    })
    if (completedFrames === 0) {
      appendGenerationActivity({
        id: 'storyboard-start',
        label: 'Storyboard Started',
        status: 'completed',
        at: started,
      })
    }
  } else if (input.sectionStatus.storyboard === 'completed') {
    appendGenerationActivity({
      id: 'storyboard',
      label: 'Storyboard Complete',
      status: 'completed',
      at: now,
    })
  }

  if (input.voiceUrl || input.sectionStatus.voice === 'completed') {
    if (input.sectionStatus.voice === 'generating') {
      appendGenerationActivity({ id: 'voice', label: 'Voice Generated', status: 'current', at: now })
    } else if (input.sectionStatus.voice === 'completed' || input.voiceUrl) {
      appendGenerationActivity({ id: 'voice', label: 'Voice Generated', status: 'completed', at: now })
    }
  }

  if (input.sectionStatus.captions === 'completed') {
    appendGenerationActivity({ id: 'captions', label: 'Captions Generated', status: 'completed', at: now })
  }

  if (input.sectionStatus.export === 'generating' || input.generationStep === 'render') {
    appendGenerationActivity({
      id: 'export',
      label: 'Preparing Export Package',
      status: 'current',
      at: now,
    })
  } else if (input.sectionStatus.export === 'completed') {
    appendGenerationActivity({ id: 'export', label: 'Export Package Ready', status: 'completed', at: now })
  }

  return getGenerationActivityLog()
}
