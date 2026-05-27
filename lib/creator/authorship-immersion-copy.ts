import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'

const AUTHORSHIP_IDENTITY = [
  'Your cinematic signature held.',
  'This world carries your directing identity.',
  'Your authored vision remains central.',
] as const

const EMOTIONAL_OWNERSHIP = [
  'Emotional ownership preserved.',
  'Your feeling-led arc remains yours.',
  'Cinematic emotion authored by you.',
] as const

const CINEMATIC_SIGNATURE = [
  'Cinematic signature atmosphere aligned.',
  'Your visual tone signature held.',
  'Signature mood continuity preserved.',
] as const

const STORYTELLING_CONFIDENCE = [
  'Visual storytelling confidence steady.',
  'Your narrative rhythm authored intentionally.',
  'Storytelling voice remains distinctly yours.',
] as const

const AUTHORED_CONTINUITY = [
  'Authored cinematic continuity held.',
  'Your visual arc carries forward.',
  'Continuity shaped by your directing identity.',
] as const

const SIGNATURE_MEMORY = [
  'Signature atmosphere remembered.',
  'Your cinematic identity echoes through beats.',
  'Authored mood memory preserved.',
] as const

const AUTHORSHIP_CONTINUITY = [
  'Authorship continuity uninterrupted.',
  'Your directing identity bridges each beat.',
  'Cinematic ownership held across the arc.',
] as const

const EXPORT_AUTHORSHIP = [
  'Cinematic authorship finalized.',
  'Your directing identity preserved through delivery.',
  'Authored visual world complete.',
] as const

export function getAuthorshipIdentityLine(
  sceneIndex: number,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    AUTHORSHIP_IDENTITY[seed % AUTHORSHIP_IDENTITY.length],
    `Beat ${sceneIndex} · ${id.label} identity`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalOwnershipLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EMOTIONAL_OWNERSHIP[seed % EMOTIONAL_OWNERSHIP.length],
    `${id.tone} · emotionally owned`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicSignatureLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    CINEMATIC_SIGNATURE[seed % CINEMATIC_SIGNATURE.length],
    `${id.rhythm} · signature held`,
  ]
  return pool[seed % pool.length]
}

export function getVisualStorytellingConfidenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    STORYTELLING_CONFIDENCE[seed % STORYTELLING_CONFIDENCE.length],
    `${id.pacing} · storytelling authored`,
  ]
  return pool[seed % pool.length]
}

export function getAuthoredContinuityLine(
  sceneIndex: number,
  totalScenes: number,
  style?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, null)
  const pool = [
    AUTHORED_CONTINUITY[seed % AUTHORED_CONTINUITY.length],
    `${id.label} arc · beat ${sceneIndex} of ${totalScenes}`,
  ]
  return pool[seed % pool.length]
}

export function getSignatureMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    SIGNATURE_MEMORY[seed % SIGNATURE_MEMORY.length],
    `${id.tone} · signature remembered`,
  ]
  return pool[seed % pool.length]
}

export function getAuthorshipContinuityLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  if (sceneIndex <= 1) return 'Authorship identity opening'
  if (sceneIndex >= totalScenes) return 'Authorship identity closure'
  return AUTHORSHIP_CONTINUITY[seed % AUTHORSHIP_CONTINUITY.length]
}

export function getExportAuthorshipImmersionLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_AUTHORSHIP[seed % EXPORT_AUTHORSHIP.length],
    `${id.label} cinematic authorship finalized`,
  ]
  return pool[seed % pool.length]
}

export function getAuthorshipImmersionHeadline(
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneCount <= 0) return `${id.label} authorship forming`
  return `Your cinematic identity · ${sceneCount} beat arc`
}
