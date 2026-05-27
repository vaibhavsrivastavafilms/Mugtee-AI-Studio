import type { CinematicNiche } from '@/lib/cinematic/niches'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import type { FilmShot } from '@/lib/cinematic/execution/screenplay-video-translator'

export type CinematicShotPlan = {
  sceneIndex: number
  role: string
  durationSec: number
  visualPrompt: string
  cameraMotion: string
  transition: 'cut' | 'dissolve' | 'hold'
  palette: string
  lighting: string
}

export type EmotionalSequenceBeat = {
  index: number
  role: string
  durationSec: number
  emotionalWeight: 'open' | 'build' | 'peak' | 'release' | 'hold'
  narrationCue: string
}

export type CinematicFilmBlueprint = {
  title: string
  hook: string
  totalDuration: number
  voicePacingWpm: number
  visualIdentity: string
  filmRhythm: string
  presenceLine: string
  narrationRhythm: string
  soundtrackBed: string
  continuityThread: string
  shots: CinematicShotPlan[]
  sequence: EmotionalSequenceBeat[]
  ready: boolean
}

export function emotionalWeightForRole(
  role: string
): EmotionalSequenceBeat['emotionalWeight'] {
  if (role === 'hook') return 'open'
  if (role === 'tension') return 'build'
  if (role === 'peak') return 'peak'
  if (role === 'aftertaste') return 'hold'
  return 'release'
}

export function buildShotPlan(
  shot: FilmShot,
  scene: {
    colorPalette?: string
    lightingMood?: string
    cameraAngle?: string
  },
  totalScenes: number
): CinematicShotPlan {
  const role = scenePacingRole(shot.sceneIndex, totalScenes)
  return {
    sceneIndex: shot.sceneIndex,
    role,
    durationSec: shot.durationSec,
    visualPrompt: shot.visualPrompt,
    cameraMotion: `${shot.motion.type} · ${shot.motion.intensity}`,
    transition: shot.transition,
    palette: scene.colorPalette || 'cinematic restrained palette',
    lighting: scene.lightingMood || 'atmospheric continuity',
  }
}

export function buildSequenceBeat(
  shot: FilmShot,
  totalScenes: number
): EmotionalSequenceBeat {
  const role = scenePacingRole(shot.sceneIndex, totalScenes)
  return {
    index: shot.sceneIndex,
    role,
    durationSec: shot.durationSec,
    emotionalWeight: emotionalWeightForRole(role),
    narrationCue: shot.narration.slice(0, 120),
  }
}

export function soundtrackBedForNiche(niche: CinematicNiche): string {
  const map: Partial<Record<CinematicNiche, string>> = {
    motivation: 'restrained pulse · breath space',
    psychology: 'soft piano · intimate room tone',
    documentary: 'warm analog bed · vinyl hush',
    storytelling: 'gentle strings · close mic warmth',
    spirituality: 'ambient drone · distant resonance',
    luxury: 'minimal pulse · polished silence',
    finance: 'controlled synth · deliberate weight',
    fitness: 'low pulse · kinetic restraint',
    'faceless reels': 'cinematic ambient bed · restrained dynamics',
  }
  return map[niche] ?? 'cinematic ambient bed · restrained dynamics'
}
