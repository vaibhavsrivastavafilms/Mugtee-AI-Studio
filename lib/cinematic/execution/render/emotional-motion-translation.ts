import type { CinematicShotRenderIntent } from '@/lib/cinematic/execution/render/cinematic-render-intent'

export function translateEmotionalMotion(
  shot: CinematicShotRenderIntent
): string {
  if (shot.transition === 'hold') return 'stillness · emotional residue'
  if (shot.motion.includes('push-in')) return 'imperceptible approach · intimate'
  if (shot.motion.includes('drift')) return 'handheld drift · quiet tension'
  return 'motivated cinematic movement · restrained'
}

export function motionAtmosphereHint(shot: CinematicShotRenderIntent): string {
  return `${translateEmotionalMotion(shot)} · ${shot.atmosphere}`
}
