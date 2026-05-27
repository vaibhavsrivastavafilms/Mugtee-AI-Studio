import type { CinematicRenderBlueprint } from '@/lib/cinematic/execution/compile/cinematic-render-blueprint'

export type CinematicRenderIntent = {
  provider: CinematicRenderProviderId
  durationSec: number
  aspectRatio: '9:16'
  shots: CinematicShotRenderIntent[]
  voicePacingWpm: number
  soundtrackBed: string
  visualThread: string
}

export type CinematicShotRenderIntent = {
  sceneIndex: number
  durationSec: number
  motion: string
  transition: string
  atmosphere: string
  /** Internal — never shown to creator */
  directionDigest: string
}

export type CinematicRenderProviderId =
  | 'runway'
  | 'luma'
  | 'kling'
  | 'pika'
  | 'sora'
  | 'stub'

export function buildCinematicRenderIntent(
  blueprint: CinematicRenderBlueprint,
  provider: CinematicRenderProviderId = 'stub'
): CinematicRenderIntent {
  return {
    provider,
    durationSec: blueprint.totalDuration,
    aspectRatio: '9:16',
    voicePacingWpm: blueprint.voicePacingWpm,
    soundtrackBed: blueprint.soundtrackBed,
    visualThread: blueprint.continuityThread,
    shots: blueprint.shots.map((shot, i) => ({
      sceneIndex: shot.sceneIndex,
      durationSec: shot.durationSec,
      motion: blueprint.motionDirections[i] ?? shot.cameraMotion,
      transition: shot.transition,
      atmosphere: `${shot.lighting} · ${shot.palette}`,
      directionDigest: shot.visualPrompt.slice(0, 280),
    })),
  }
}
