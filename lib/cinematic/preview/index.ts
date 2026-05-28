export type {
  CinematicPrevisualization,
  PrevisualizationContext,
} from '@/lib/cinematic/preview/cinematic-previsualization'
export type { EscalationPreview } from '@/lib/cinematic/preview/cinematic-escalation-preview'
export type { EmotionalPreviewRhythm } from '@/lib/cinematic/preview/emotional-preview-rhythm'
export type { SequenceAnticipation } from '@/lib/cinematic/preview/sequence-anticipation-engine'

export {
  buildCinematicPrevisualization,
  previewAnticipationSubtitle,
} from '@/lib/cinematic/preview/cinematic-previsualization'
export {
  buildEscalationPreview,
  escalationPresenceForIndex,
} from '@/lib/cinematic/preview/cinematic-escalation-preview'
export {
  buildEmotionalPreviewRhythm,
  mergePreviewRhythm,
} from '@/lib/cinematic/preview/emotional-preview-rhythm'
export { buildSequenceAnticipation } from '@/lib/cinematic/preview/sequence-anticipation-engine'
