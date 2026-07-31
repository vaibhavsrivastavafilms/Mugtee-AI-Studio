/**
 * Production OS V2 — real pipeline phase events.
 * Every phase emits started → running → completed|failed with percentage + duration.
 */

import {
  PRODUCTION_OS_PHASE_ORDER,
  type ProductionOsPhaseId,
} from '@/lib/production-os/phases'

export type ProductionOsV2EventStatus =
  | 'started'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'

export type ProductionOsV2PhaseEvent = {
  id: string
  phase: ProductionOsPhaseId
  status: ProductionOsV2EventStatus
  message: string
  percentage: number
  /** Phase wall-clock ms when completed/failed. */
  durationMs?: number
  /** Scene / image counters for granular UI. */
  current?: number
  total?: number
  /** FFmpeg / Remotion extras when rendering. */
  meta?: {
    fps?: number
    frame?: number
    speed?: string
    file?: string
    remainingSec?: number
  }
  at: number
}

export type ProductionOsV2Checkpoint = {
  projectId: string | null
  phase: ProductionOsPhaseId
  sceneIndex: number
  imageIndex: number
  completedPhases: ProductionOsPhaseId[]
  updatedAt: number
}

/** Studio-style activity lines (user-facing). */
export const PRODUCTION_OS_V2_ACTIVITY: Record<
  ProductionOsPhaseId,
  { started: string; completed: string; failed: string }
> = {
  idea_discovery: {
    started: '🧠 Understanding your idea…',
    completed: '🧠 Idea locked',
    failed: '🧠 Idea step needs a retry',
  },
  deep_research: {
    started: '🧠 Researching your topic…',
    completed: '🧠 Research completed',
    failed: '🧠 Research needs a retry',
  },
  creative_direction: {
    started: '🎬 Setting creative direction…',
    completed: '🎬 Creative direction ready',
    failed: '🎬 Creative direction failed',
  },
  script: {
    started: '✍ Writing script…',
    completed: '✍ Script complete',
    failed: '✍ Script failed',
  },
  screenplay: {
    started: '✍ Writing screenplay…',
    completed: '✍ Screenplay complete',
    failed: '✍ Screenplay failed',
  },
  storyboard: {
    started: '🎨 Building storyboard…',
    completed: '🎨 Storyboard complete',
    failed: '🎨 Storyboard failed',
  },
  shot_list: {
    started: '📋 Building shot list…',
    completed: '📋 Shot list ready',
    failed: '📋 Shot list failed',
  },
  voiceover: {
    started: '🎙 Generating voice…',
    completed: '🎙 Voice generated',
    failed: '🎙 Voice unavailable — continuing without narration',
  },
  image_generation: {
    started: '🖼 Generating images…',
    completed: '🖼 Images complete',
    failed: '🖼 Some images failed',
  },
  animation: {
    started: '🎬 Animating scenes…',
    completed: '🎬 Animation complete',
    failed: '🎬 Animation failed on a scene',
  },
  video_editing: {
    started: '🎞 Editing timeline…',
    completed: '🎞 Timeline assembled',
    failed: '🎞 Timeline edit failed',
  },
  music: {
    started: '🎵 Mixing music…',
    completed: '🎵 Music mixed',
    failed: '🎵 Music skipped',
  },
  sound_design: {
    started: '🔊 Designing sound…',
    completed: '🔊 Sound design ready',
    failed: '🔊 Sound design skipped',
  },
  captions: {
    started: '💬 Burning captions…',
    completed: '💬 Captions ready',
    failed: '💬 Captions failed',
  },
  rendering: {
    started: '🎞 Rendering final video…',
    completed: '📦 Export complete',
    failed: '🎞 Render failed',
  },
}

export function phaseProgressFloor(phase: ProductionOsPhaseId): number {
  const idx = PRODUCTION_OS_PHASE_ORDER.indexOf(phase)
  if (idx < 0) return 0
  return Math.round((idx / PRODUCTION_OS_PHASE_ORDER.length) * 100)
}

export function phaseProgressCeiling(phase: ProductionOsPhaseId): number {
  const idx = PRODUCTION_OS_PHASE_ORDER.indexOf(phase)
  if (idx < 0) return 99
  return Math.min(99, Math.round(((idx + 1) / PRODUCTION_OS_PHASE_ORDER.length) * 100))
}

export function messageForPhaseEvent(
  phase: ProductionOsPhaseId,
  status: ProductionOsV2EventStatus,
  opts?: { current?: number; total?: number }
): string {
  const copy = PRODUCTION_OS_V2_ACTIVITY[phase]
  if (status === 'completed' || status === 'skipped') return copy.completed
  if (status === 'failed') return copy.failed
  if (phase === 'image_generation' && opts?.total) {
    const n = opts.current ?? 0
    return `🖼 Image ${n} / ${opts.total} complete`
  }
  if (phase === 'animation' && opts?.total) {
    const n = Math.min(opts.total, (opts.current ?? 0) + 1)
    return `🎬 Animating scene ${n} of ${opts.total}`
  }
  if (phase === 'storyboard' && opts?.total) {
    const n = Math.min(opts.total, (opts.current ?? 0) + 1)
    return `🎨 Generating scene ${n} of ${opts.total}`
  }
  return copy.started
}

export function createPhaseEvent(
  partial: Omit<ProductionOsV2PhaseEvent, 'id' | 'at' | 'message' | 'percentage'> & {
    message?: string
    percentage?: number
    id?: string
    at?: number
  }
): ProductionOsV2PhaseEvent {
  const status = partial.status
  const percentage =
    partial.percentage ??
    (status === 'completed' || status === 'skipped'
      ? phaseProgressCeiling(partial.phase)
      : status === 'failed'
        ? phaseProgressFloor(partial.phase)
        : Math.round(
            (phaseProgressFloor(partial.phase) + phaseProgressCeiling(partial.phase)) / 2
          ))

  return {
    id: partial.id ?? `${partial.phase}:${status}:${partial.at ?? Date.now()}`,
    phase: partial.phase,
    status,
    message:
      partial.message ??
      messageForPhaseEvent(partial.phase, status, {
        current: partial.current,
        total: partial.total,
      }),
    percentage,
    durationMs: partial.durationMs,
    current: partial.current,
    total: partial.total,
    meta: partial.meta,
    at: partial.at ?? Date.now(),
  }
}
