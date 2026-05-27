import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import type { CinematicScene } from '@/stores/cinematic-project'

const DIRECTORIAL_PRESENCE = [
  'Your emotional direction held.',
  'Intentionally directing this beat.',
  'Cinematic intent authored by you.',
] as const

const EDITORIAL_GUIDANCE = [
  'Editorial atmosphere aligned to your vision.',
  'Visual tone held with quiet confidence.',
  'Directing atmosphere remains yours.',
] as const

const VISUAL_CONFIDENCE = [
  'Visual rhythm directed with intention.',
  'Your cinematic confidence preserved.',
  'Frame direction emotionally grounded.',
] as const

const SHOT_INTENTION = [
  'Shot intention emotionally held.',
  'Visual beat directed with purpose.',
  'Emotional framing intentionally shaped.',
] as const

const AUTHORSHIP = [
  'Creator authorship preserved.',
  'Your directing voice remains central.',
  'Cinematic authorship held through the arc.',
] as const

const DIRECTORIAL_RHYTHM = [
  'Directorial rhythm steady.',
  'Visual pacing authored intentionally.',
  'Emotional cadence directed by you.',
] as const

const INTENTION_CONTINUITY = [
  'Shot intention carries forward.',
  'Emotional framing continuity held.',
  'Visual intent bridges across beats.',
] as const

const DIRECTORIAL_ATMOSPHERE = [
  'Atmosphere directed with intention.',
  'Emotional environment shaped by you.',
  'Cinematic mood authored deliberately.',
] as const

const EXPORT_DIRECTORIAL = [
  'Directorial presence finalized.',
  'Your cinematic authorship preserved through delivery.',
  'Intentional directing arc complete.',
] as const

export function getDirectorialPresenceLine(
  sceneIndex: number,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    DIRECTORIAL_PRESENCE[seed % DIRECTORIAL_PRESENCE.length],
    `Beat ${sceneIndex} · ${id.label} direction`,
  ]
  return pool[seed % pool.length]
}

export function getEditorialGuidanceAtmosphereLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EDITORIAL_GUIDANCE[seed % EDITORIAL_GUIDANCE.length],
    `${id.tone} · editorially held`,
  ]
  return pool[seed % pool.length]
}

export function getVisualDirectingConfidenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    VISUAL_CONFIDENCE[seed % VISUAL_CONFIDENCE.length],
    `${id.rhythm} · directed intentionally`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalShotIntentionLine(
  scene?: Pick<CinematicScene, 'emotion' | 'title'> | null,
  style?: string | null,
  seed = 0
): string {
  if (scene?.emotion?.trim()) {
    return `${scene.emotion.trim()} · shot intention`
  }
  if (scene?.title?.trim()) {
    return `${scene.title.trim()} · emotionally directed`
  }
  const id = resolveCreatorIdentity(style, null)
  return `${id.pacing} · ${SHOT_INTENTION[seed % SHOT_INTENTION.length].toLowerCase()}`
}

export function getCreatorAuthorshipLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    AUTHORSHIP[seed % AUTHORSHIP.length],
    `${id.label} authorship held`,
  ]
  return pool[seed % pool.length]
}

export function getDirectorialRhythmLine(
  sceneIndex: number,
  totalScenes: number,
  style?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, null)
  const pool = [
    DIRECTORIAL_RHYTHM[seed % DIRECTORIAL_RHYTHM.length],
    `${id.rhythm} · beat ${sceneIndex} of ${totalScenes}`,
  ]
  return pool[seed % pool.length]
}

export function getShotIntentionContinuityLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  if (sceneIndex <= 1) return 'Opening shot intention set'
  if (sceneIndex >= totalScenes) return 'Closing shot intention held'
  return INTENTION_CONTINUITY[seed % INTENTION_CONTINUITY.length]
}

export function getDirectorialAtmosphereEchoLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    DIRECTORIAL_ATMOSPHERE[seed % DIRECTORIAL_ATMOSPHERE.length],
    `${id.tone} · atmospherically directed`,
  ]
  return pool[seed % pool.length]
}

export function getExportDirectorialPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_DIRECTORIAL[seed % EXPORT_DIRECTORIAL.length],
    `${id.label} directing presence finalized`,
  ]
  return pool[seed % pool.length]
}

export function getDirectorialPresenceHeadline(
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneCount <= 0) return `${id.label} directing presence forming`
  return `Intentionally directed · ${sceneCount} beat arc`
}
