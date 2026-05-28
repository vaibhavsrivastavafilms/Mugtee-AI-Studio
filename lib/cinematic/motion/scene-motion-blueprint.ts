import type { GeneratedScene } from '@/lib/cinematic/generation'
import { buildMotionSequence } from '@/lib/cinematic/motion/cinematic-motion-sequencing'
import { averageTransitionFadeMs } from '@/lib/cinematic/motion/emotional-transition-motion'
import { buildVisualMovementMemory } from '@/lib/cinematic/motion/visual-movement-memory'

export type SceneMotionBlueprint = {
  steps: ReturnType<typeof buildMotionSequence>
  averageFadeMs: number
  continuityThread: string
  motionDirections: string[]
}

export function buildSceneMotionBlueprint(
  scenes: GeneratedScene[]
): SceneMotionBlueprint {
  const steps = buildMotionSequence(scenes)
  const memory = buildVisualMovementMemory(scenes, scenes.length - 1)

  return {
    steps,
    averageFadeMs: averageTransitionFadeMs(scenes.length || 1),
    continuityThread: memory.continuityThread,
    motionDirections: steps.map((s) => `${s.motionType} · ${s.transitionOut}`),
  }
}
