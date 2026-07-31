/**
 * Mugtee Thinking Engine — natural companion language only.
 * Never expose models, APIs, providers, FFmpeg, Remotion, or stack traces.
 */

import {
  getV4Phase,
  type ProductionOsV4PhaseId,
} from '@/lib/production-os/v4/pipeline'

const TECHNICAL_PATTERNS =
  /\b(api|ffmpeg|remotion|openai|elevenlabs|runway|seedance|supabase|http\s*\d{3}|stack|exception|provider|model|token|gpu|chromium)\b/gi

export type ThinkingEvent = {
  phase: ProductionOsV4PhaseId
  status: 'queued' | 'running' | 'completed' | 'failed' | 'retrying'
  message: string
  /** Optional counters for real progress lines */
  current?: number
  total?: number
  at: number
}

/** Strip / rewrite anything that sounds like infrastructure. */
export function sanitizeCompanionMessage(raw: string): string {
  const cleaned = raw.replace(TECHNICAL_PATTERNS, '').replace(/\s{2,}/g, ' ').trim()
  if (!cleaned) return '✨ Working on your film…'
  return cleaned
}

export function thinkingForPhase(
  phase: ProductionOsV4PhaseId,
  status: ThinkingEvent['status'] = 'running'
): string {
  const base = getV4Phase(phase).thinking
  if (status === 'completed') {
    if (phase === 'export') return '🎉 Your movie is ready.'
    if (phase === 'deep_research') return '🔍 Research completed'
    if (phase === 'screenplay' || phase === 'script') return '🧠 Screenplay ready'
    if (phase === 'character_bible') return '🎭 Characters cast'
    if (phase === 'environment_bible') return '🎨 World designed'
    if (phase === 'voice') return '🎙 Narration recorded'
    if (phase === 'animation') return '🎥 Performances animated'
    if (phase === 'rendering') return '📦 Export rendered'
    return sanitizeCompanionMessage(base.replace('…', ' — done'))
  }
  if (status === 'failed') {
    return '✨ Adjusting a scene — continuing your film…'
  }
  if (status === 'retrying') {
    return '✨ Refining a moment — almost there…'
  }
  return sanitizeCompanionMessage(base)
}

export function thinkingForImageProgress(done: number, total: number): string {
  return `🖼 Generating storyboard… ${Math.min(done, total)} of ${total}`
}

export function thinkingForAnimationProgress(done: number, total: number): string {
  return `🎥 Animating performances… Scene ${Math.min(done + (done < total ? 1 : 0), total)} of ${total}`
}

export function thinkingForRenderProgress(framesDone: number, framesTotal: number): string {
  if (framesTotal <= 0) return '📦 Rendering final export…'
  return `📦 Rendering final export… ${framesDone} / ${framesTotal}`
}

export function createThinkingEvent(
  phase: ProductionOsV4PhaseId,
  status: ThinkingEvent['status'],
  opts?: { current?: number; total?: number; message?: string }
): ThinkingEvent {
  let message = opts?.message ?? thinkingForPhase(phase, status)
  if (phase === 'image_generation' && opts?.total) {
    message = thinkingForImageProgress(opts.current ?? 0, opts.total)
  }
  if (phase === 'animation' && opts?.total) {
    message = thinkingForAnimationProgress(opts.current ?? 0, opts.total)
  }
  if (phase === 'rendering' && opts?.total) {
    message = thinkingForRenderProgress(opts.current ?? 0, opts.total)
  }
  return {
    phase,
    status,
    message: sanitizeCompanionMessage(message),
    current: opts?.current,
    total: opts?.total,
    at: Date.now(),
  }
}

/** Map Quick Cut step → V4 thinking phase. */
export function quickCutStepToV4Phase(step: string): ProductionOsV4PhaseId {
  switch (step) {
    case 'analyzing':
    case 'title':
    case 'hook':
      return 'idea_discovery'
    case 'script':
      return 'script'
    case 'scenes':
      return 'screenplay'
    case 'images':
      return 'image_generation'
    case 'voice':
      return 'voice'
    case 'motion':
      return 'animation'
    case 'render':
      return 'rendering'
    case 'complete':
      return 'export'
    default:
      return 'creative_direction'
  }
}
