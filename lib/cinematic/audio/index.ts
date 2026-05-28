export type { BreathingCadence } from '@/lib/cinematic/audio/emotional-breathing-engine'
export type { VoicePerformancePlan } from '@/lib/cinematic/audio/cinematic-voice-performance'
export type { SceneEmphasis } from '@/lib/cinematic/audio/scene-emphasis-mapping'
export type { NarrationEscalationMemory } from '@/lib/cinematic/audio/narration-escalation-memory'

export {
  adjustWpmForBreathing,
  breathingCadenceForRole,
  breathingCadenceForScene,
} from '@/lib/cinematic/audio/emotional-breathing-engine'
export { buildCinematicVoicePerformance } from '@/lib/cinematic/audio/cinematic-voice-performance'
export {
  buildSceneEmphasisMap,
  emphasisForSceneIndex,
} from '@/lib/cinematic/audio/scene-emphasis-mapping'
export { recallNarrationEscalation } from '@/lib/cinematic/audio/narration-escalation-memory'
