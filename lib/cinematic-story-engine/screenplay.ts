import type {
  ScreenplayScene,
  StoryBeatId,
  StoryStructure,
  StoryUnderstanding,
} from '@/lib/cinematic-story-engine/types'

const CAMERA_CYCLE = [
  'Wide establishing — slow push in',
  'Medium — tracking with subject',
  'Close-up — emotional hold',
  'Over-shoulder — relational tension',
  'Low angle — rising power',
  'High angle — vulnerability',
  'Orbit — revelation',
  'Handheld intimacy — raw truth',
] as const

const LIGHT_CYCLE = [
  'Golden hour soft key',
  'Cool blue ambient with warm practicals',
  'High contrast dramatic side light',
  'Diffused overcast natural',
  'Candle / sacred warm glow',
  'Neon rim against night',
] as const

const TRANSITIONS = [
  'cross dissolve',
  'match cut',
  'fade through light',
  'whip pan',
  'hard cut',
] as const

function sceneCountForDuration(lengthSec: number): number {
  // ~5–8s per scene for shorts; clamp 4–18
  const n = Math.round(lengthSec / 6)
  return Math.max(4, Math.min(18, n))
}

function beatForIndex(i: number, total: number): StoryBeatId {
  const t = i / Math.max(1, total - 1)
  if (t < 0.15) return 'beginning'
  if (t < 0.35) return 'conflict'
  if (t < 0.7) return 'journey'
  if (t < 0.88) return 'climax'
  return 'resolution'
}

function narrationForBeat(
  beat: StoryBeatId,
  structure: StoryStructure,
  u: StoryUnderstanding,
  sceneNumber: number
): string {
  const lead = u.characters[0] ?? 'they'
  switch (beat) {
    case 'beginning':
      return structure.beginning
    case 'conflict':
      return `${structure.conflict} Scene ${sceneNumber} tightens the stakes.`
    case 'journey':
      return `${lead} presses forward. ${structure.journey}`
    case 'climax':
      return structure.climax
    case 'resolution':
      return structure.resolution
  }
}

/** STEP 3 — Auto-split screenplay into timed cinematic scenes. */
export function generateScreenplay(
  u: StoryUnderstanding,
  structure: StoryStructure
): ScreenplayScene[] {
  const count = sceneCountForDuration(u.lengthSec)
  const baseDur = u.lengthSec / count
  const lead = u.characters[0] ?? 'Protagonist'

  return Array.from({ length: count }, (_, i) => {
    const beat = beatForIndex(i, count)
    const sceneNumber = i + 1
    return {
      sceneNumber,
      durationSec: Math.max(3, Math.round(baseDur * 10) / 10),
      location: u.setting,
      characters: u.characters,
      dialogue: '',
      narration: narrationForBeat(beat, structure, u, sceneNumber),
      cameraDirection: CAMERA_CYCLE[i % CAMERA_CYCLE.length]!,
      lighting: LIGHT_CYCLE[i % LIGHT_CYCLE.length]!,
      emotion: u.emotion,
      transition: i === 0 ? 'cut' : TRANSITIONS[i % TRANSITIONS.length]!,
      beat,
    }
  }).map((scene, i, arr) => {
    // Slight duration variance for rhythm
    if (i === arr.length - 1) {
      const used = arr.slice(0, -1).reduce((s, x) => s + x.durationSec, 0)
      return {
        ...scene,
        durationSec: Math.max(3, Math.round((u.lengthSec - used) * 10) / 10),
        characters: [lead, ...u.characters.slice(1)],
      }
    }
    return scene
  })
}
