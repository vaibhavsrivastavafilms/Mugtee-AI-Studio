export type { MotionSequenceStep } from '@/lib/cinematic/motion/cinematic-motion-sequencing'
export type { EmotionalTransitionMotion } from '@/lib/cinematic/motion/emotional-transition-motion'
export type { VisualMovementMemory } from '@/lib/cinematic/motion/visual-movement-memory'
export type { SceneMotionBlueprint } from '@/lib/cinematic/motion/scene-motion-blueprint'

export {
  buildMotionSequence,
  motionDirectionsFromScenes,
} from '@/lib/cinematic/motion/cinematic-motion-sequencing'
export {
  averageTransitionFadeMs,
  emotionalTransitionMotion,
} from '@/lib/cinematic/motion/emotional-transition-motion'
export {
  buildVisualMovementMemory,
  movementHintForScene,
} from '@/lib/cinematic/motion/visual-movement-memory'
export { buildSceneMotionBlueprint } from '@/lib/cinematic/motion/scene-motion-blueprint'
