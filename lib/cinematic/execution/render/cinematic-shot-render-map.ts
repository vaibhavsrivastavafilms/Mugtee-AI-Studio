import type { CinematicRenderIntent } from '@/lib/cinematic/execution/render/cinematic-render-intent'
import { motionAtmosphereHint } from '@/lib/cinematic/execution/render/emotional-motion-translation'

export function buildCinematicShotRenderMap(intent: CinematicRenderIntent) {
  return intent.shots.map((shot) => ({
    index: shot.sceneIndex,
    durationSec: shot.durationSec,
    motion: motionAtmosphereHint(shot),
    transition: shot.transition,
  }))
}
