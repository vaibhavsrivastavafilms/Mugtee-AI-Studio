/**
 * Real progress + ETA from completed work units — never simulated.
 */

import { formatEtaLabel } from '@/lib/generation/generation-eta'
import {
  PRODUCTION_OS_V3_PHASE_ORDER,
  type ProductionOsV3PhaseId,
  type ProductionOsV3ProgressSnapshot,
  type ProductionWorkerReport,
  type SceneProductionUnit,
} from '@/lib/production-os/v3/types'

const PHASE_LABEL: Record<ProductionOsV3PhaseId, string> = {
  idea: '✨ Understanding your idea…',
  research: '🧠 Planning your story…',
  creative_direction: '🎬 Directing your scenes…',
  script: '✍ Writing script…',
  screenplay: '✍ Writing screenplay…',
  storyboard: '🎨 Designing your world…',
  shot_list: '📋 Building shot list…',
  voice: '🎙 Recording performances…',
  characters: '🎭 Building character references…',
  environment: '🏞 Locking environment…',
  image_generation: '🖼 Generating images…',
  animation: '🎬 Animating scenes…',
  video_editing: '🎞 Editing timeline…',
  music: '🎵 Scoring your film…',
  sound_design: '🔊 Designing sound…',
  captions: '💬 Timing captions…',
  rendering: '🎞 Rendering the final movie…',
  quality_check: '✅ Quality check…',
  export: '📦 Packaging Creator Pack…',
}

const PHASE_WEIGHT = 1 / PRODUCTION_OS_V3_PHASE_ORDER.length

export type V3ProgressInput = {
  completedPhases: ProductionOsV3PhaseId[]
  currentPhase: ProductionOsV3PhaseId | null
  scenes: SceneProductionUnit[]
  framesRendered?: number
  framesTotal?: number
  renderSpeedFps?: number
  recentReports?: ProductionWorkerReport[]
  isComplete?: boolean
}

export function computeV3Progress(input: V3ProgressInput): ProductionOsV3ProgressSnapshot {
  if (input.isComplete) {
    return {
      overallPercent: 100,
      phase: 'export',
      phaseLabel: '🎉 Your movie is ready.',
      imagesLabel: null,
      animationLabel: null,
      framesLabel: null,
      renderPercent: 100,
      etaSeconds: 0,
      etaLabel: 'Done',
      activity: ['🎉 Your movie is ready.'],
      isComplete: true,
    }
  }

  const done = new Set(input.completedPhases)
  let score = 0

  for (const phase of PRODUCTION_OS_V3_PHASE_ORDER) {
    if (done.has(phase)) {
      score += PHASE_WEIGHT * 100
      continue
    }
    if (phase !== input.currentPhase) continue

    if (phase === 'image_generation') {
      const total = Math.max(1, input.scenes.length)
      const n = input.scenes.filter((s) => s.checkpoint.image).length
      score += PHASE_WEIGHT * 100 * (n / total)
    } else if (phase === 'animation') {
      const total = Math.max(1, input.scenes.length)
      const n = input.scenes.filter((s) => s.checkpoint.animation || s.videoUrl).length
      score += PHASE_WEIGHT * 100 * (n / total)
    } else if (phase === 'rendering' && input.framesTotal && input.framesTotal > 0) {
      const n = input.framesRendered ?? 0
      score += PHASE_WEIGHT * 100 * Math.min(0.99, n / input.framesTotal)
    } else {
      score += PHASE_WEIGHT * 100 * 0.35
    }
  }

  const overallPercent = Math.min(99, Math.max(0, Math.round(score)))

  const imagesDone = input.scenes.filter((s) => s.checkpoint.image || s.imageUrl).length
  const animDone = input.scenes.filter((s) => s.checkpoint.animation || s.videoUrl).length
  const sceneTotal = input.scenes.length

  const imagesLabel =
    sceneTotal > 0 ? `${imagesDone} / ${sceneTotal}` : null
  const animationLabel =
    sceneTotal > 0 ? `${animDone} / ${sceneTotal} scenes` : null
  const framesLabel =
    input.framesTotal && input.framesTotal > 0
      ? `${input.framesRendered ?? 0} / ${input.framesTotal} frames`
      : null

  const renderPercent =
    input.framesTotal && input.framesTotal > 0
      ? Math.min(99, Math.round(((input.framesRendered ?? 0) / input.framesTotal) * 100))
      : null

  const etaSeconds = estimateEtaSeconds(input)
  const activity = (input.recentReports ?? [])
    .slice(-8)
    .map((r) => r.message)
    .filter(Boolean)

  if (activity.length === 0 && input.currentPhase) {
    activity.push(PHASE_LABEL[input.currentPhase])
  }

  return {
    overallPercent,
    phase: input.currentPhase,
    phaseLabel: input.currentPhase
      ? PHASE_LABEL[input.currentPhase]
      : '✨ Understanding your idea…',
    imagesLabel,
    animationLabel,
    framesLabel,
    renderPercent,
    etaSeconds,
    etaLabel: etaSeconds <= 0 ? 'Almost done' : `${formatEtaLabel(etaSeconds)} remaining`,
    activity,
    isComplete: false,
  }
}

function estimateEtaSeconds(input: V3ProgressInput): number {
  let remaining = 0
  const done = new Set(input.completedPhases)
  const sceneCount = Math.max(1, input.scenes.length)

  const defaults: Partial<Record<ProductionOsV3PhaseId, number>> = {
    idea: 4,
    research: 6,
    creative_direction: 5,
    script: 12,
    screenplay: 8,
    storyboard: 8,
    shot_list: 4,
    voice: 14,
    characters: 6,
    environment: 5,
    image_generation: 8 * sceneCount,
    animation: 7 * sceneCount,
    video_editing: 8,
    music: 6,
    sound_design: 4,
    captions: 4,
    rendering: 90,
    quality_check: 3,
    export: 5,
  }

  for (const phase of PRODUCTION_OS_V3_PHASE_ORDER) {
    if (done.has(phase)) continue
    if (phase === 'image_generation') {
      const left = input.scenes.filter((s) => !s.checkpoint.image && !s.imageUrl).length
      remaining += left * 8
      continue
    }
    if (phase === 'animation') {
      const left = input.scenes.filter((s) => !s.checkpoint.animation && !s.videoUrl).length
      remaining += left * 7
      continue
    }
    if (phase === 'rendering' && input.framesTotal && input.framesTotal > 0) {
      const left = Math.max(0, input.framesTotal - (input.framesRendered ?? 0))
      const fps = input.renderSpeedFps && input.renderSpeedFps > 0 ? input.renderSpeedFps : 8
      remaining += Math.ceil(left / fps)
      continue
    }
    remaining += defaults[phase] ?? 8
  }

  return Math.max(8, remaining)
}

export function activityMessageForWorker(report: ProductionWorkerReport): string {
  return report.message
}
