import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { buildEscalationPreview } from '@/lib/cinematic/preview/cinematic-escalation-preview'
import { buildEmotionalPreviewRhythm } from '@/lib/cinematic/preview/emotional-preview-rhythm'
import { buildSequenceAnticipation } from '@/lib/cinematic/preview/sequence-anticipation-engine'

export type PrevisualizationContext = {
  script: string
  hook: string
  duration: number
  style?: string | null
}

export type CinematicPrevisualization = {
  presenceLine: string
  anticipationBeat: string
  buildupPhase: 'opening' | 'rising' | 'peak' | 'settling'
  rhythmLabel: string
  visualContinuityHint: string
  sceneAnticipationMs: number[]
  escalationLine: string
}

export function buildCinematicPrevisualization(
  output: Partial<CinematicGenerationOutput>,
  context: PrevisualizationContext
): CinematicPrevisualization {
  const scenes = output.scenes ?? []
  const anticipation = buildSequenceAnticipation(scenes, context.duration)
  const rhythm = buildEmotionalPreviewRhythm(scenes, context.duration)
  const escalation = buildEscalationPreview(scenes)

  const hookLine = context.hook.trim()
    ? `“${context.hook.slice(0, 72)}${context.hook.length > 72 ? '…' : ''}” gathers before the lens`
    : anticipation.presenceLine

  return {
    presenceLine: hookLine,
    anticipationBeat: escalation.currentBeat,
    buildupPhase: escalation.phase,
    rhythmLabel: rhythm.label,
    visualContinuityHint: anticipation.continuityHint,
    sceneAnticipationMs: anticipation.intervalsMs,
    escalationLine: escalation.escalationLine,
  }
}

export function previewAnticipationSubtitle(
  previs: CinematicPrevisualization
): string {
  return [previs.escalationLine, previs.rhythmLabel].filter(Boolean).join(' · ')
}
