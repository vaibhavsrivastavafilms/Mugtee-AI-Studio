import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'

const LEGACY_ARCHIVE_ANCHOR = [
  'Your cinematic world lives here.',
  'Your cinematic worlds remain preserved.',
  'This authored world remains.',
] as const

const EMOTIONAL_ARCHIVE = [
  'Your cinematic worlds remain preserved.',
  'Visual storytelling legacy continues.',
  'Atmospheric authorship remains intact.',
] as const

const CINEMATIC_PERMANENCE = [
  'Cinematic permanence held.',
  'Your directed world preserved.',
  'Emotional visual legacy steady.',
] as const

const CREATOR_LEGACY = [
  'Creator legacy atmosphere aligned.',
  'Your directing legacy echoes forward.',
  'Authored legacy continuity preserved.',
] as const

const ARCHIVE_PRESENCE = [
  'Authored worlds emotionally alive.',
  'Cinematic memory atmosphere calm.',
  'Past worlds cinematically remembered.',
] as const

const WORLD_RECALL = [
  'Emotional world recall gentle.',
  'Visual atmosphere remembered.',
  'Signature mood recalled quietly.',
] as const

const STORYLINE_MEMORY = [
  'Visual storyline memory held.',
  'Narrative rhythm recognizable.',
  'Storyline signature connected.',
] as const

const LEGACY_RHYTHM = [
  'Your cinematic rhythm is recognizable.',
  'Emotional pacing continuity remains.',
  'Legacy rhythm atmospherically held.',
] as const

const AUTHORSHIP_CONTINUITY = [
  'Authorship continuity preserved.',
  'Visual identity thread steady.',
  'Emotional signature continues.',
] as const

const SIGNATURE_CONTINUATION = [
  'Emotional signature continuation held.',
  'Authored visual identity persists.',
  'Signature atmosphere consistent.',
] as const

const IDENTITY_THREAD = [
  'Visual identity thread uninterrupted.',
  'Creator signature atmospherically linked.',
  'Identity continuity emotionally held.',
] as const

const WORLD_MEMORY = [
  'Cinematic world memory preserved.',
  'Authored worlds emotionally connected.',
  'World memory atmospherically held.',
] as const

const RETURN_PRESENCE = [
  'Returning to your cinematic atmosphere.',
  'Your emotional storytelling rhythm remains.',
  'Visual authorship continuity preserved.',
] as const

const WORLD_REENTRY = [
  'Emotional world reentry calm.',
  'Cinematic familiarity restored.',
  'Authored atmosphere welcomes you back.',
] as const

const ATMOSPHERE_RECALL = [
  'Authored atmosphere recalled.',
  'Emotional mood continuity held.',
  'Visual tone familiar and yours.',
] as const

const SESSION_CONTINUITY = [
  'Cinematic session continuity preserved.',
  'Your worlds remain emotionally present.',
  'Storytelling rhythm continues naturally.',
] as const

const STORY_PRESENCE = [
  'Emotional story presence lasting.',
  'Visual narrative moment preserved.',
  'Authored beat cinematically memorable.',
] as const

const AUTHORSHIP_ECHO = [
  'Visual authorship echo held.',
  'Your directing voice remembered.',
  'Authored framing emotionally lasting.',
] as const

const MEMORY_DEPTH = [
  'Cinematic memory depth restrained.',
  'Emotional permanence quietly held.',
  'Visual story moment preserved.',
] as const

const LEGACY_ATMOSPHERE = [
  'Timeless cinematic atmosphere.',
  'Emotionally preserved visual world.',
  'Creator-owned legacy mood calm.',
] as const

const WORLD_PRESENCE = [
  'Your cinematic worlds live with me.',
  'Authored worlds emotionally present.',
  'Cinematic worlds endure quietly.',
] as const

const MEMORY_ATMOSPHERE = [
  'Authored memory atmosphere aligned.',
  'Legacy mood editorially restrained.',
  'Cinematic preservation rhythm steady.',
] as const

const PRESERVATION_RHYTHM = [
  'Cinematic preservation rhythm held.',
  'Emotional legacy breathing steady.',
  'Visual permanence atmospherically calm.',
] as const

const EXPORT_LEGACY_PRIMARY = [
  'Your cinematic world now lives within your directing legacy.',
  'Visual storytelling continuity preserved.',
  'Atmospheric authorship preserved.',
] as const

const EXPORT_LEGACY_SECONDARY = [
  'Emotional storytelling legacy endures.',
  'Your authored worlds remain cinematically alive.',
  'Creator legacy atmosphere complete.',
] as const

const EXPORT_AUTHORSHIP_LEGACY = [
  'Authored world preservation held.',
  'Cinematic authorship legacy finalized.',
  'Your visual identity preserved through delivery.',
] as const

export function getLegacyArchiveAnchorLine(
  sceneIndex: number,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    LEGACY_ARCHIVE_ANCHOR[seed % LEGACY_ARCHIVE_ANCHOR.length],
    `Beat ${sceneIndex} · ${id.label} world endures`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalArchivePresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EMOTIONAL_ARCHIVE[seed % EMOTIONAL_ARCHIVE.length],
    `${id.tone} · preserved`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicPermanenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    CINEMATIC_PERMANENCE[seed % CINEMATIC_PERMANENCE.length],
    `${id.tone} · permanently held`,
  ]
  return pool[seed % pool.length]
}

export function getCreatorLegacyPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    CREATOR_LEGACY[seed % CREATOR_LEGACY.length],
    `${id.label} legacy · quietly preserved`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicArchivePresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    ARCHIVE_PRESENCE[seed % ARCHIVE_PRESENCE.length],
    `${id.rhythm} · atmospherically remembered`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalWorldRecallLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    WORLD_RECALL[seed % WORLD_RECALL.length],
    `${id.tone} · emotionally recalled`,
  ]
  return pool[seed % pool.length]
}

export function getVisualStorylineMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    STORYLINE_MEMORY[seed % STORYLINE_MEMORY.length],
    `${id.pacing} · storyline remembered`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicLegacyRhythmLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    LEGACY_RHYTHM[seed % LEGACY_RHYTHM.length],
    `${id.rhythm} · legacy held`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicAuthorshipContinuityLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    AUTHORSHIP_CONTINUITY[seed % AUTHORSHIP_CONTINUITY.length],
    `Authorship · beat ${sceneIndex} of ${totalScenes}`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalSignatureContinuationLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    SIGNATURE_CONTINUATION[seed % SIGNATURE_CONTINUATION.length],
    `${id.tone} · signature continues`,
  ]
  return pool[seed % pool.length]
}

export function getVisualIdentityThreadLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    IDENTITY_THREAD[seed % IDENTITY_THREAD.length],
    `${id.label} identity · threaded`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicWorldMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    WORLD_MEMORY[seed % WORLD_MEMORY.length],
    `${id.rhythm} · world remembered`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicReturnPresenceLine(
  status: string,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    RETURN_PRESENCE[seed % RETURN_PRESENCE.length],
    `Returning to your ${id.label.toLowerCase()} world`,
  ]
  if (status === 'scenes') {
    return pool[seed % pool.length]
  }
  return pool[(seed + 1) % pool.length]
}

export function getEmotionalWorldReentryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    WORLD_REENTRY[seed % WORLD_REENTRY.length],
    `${id.tone} · reentry calm`,
  ]
  return pool[seed % pool.length]
}

export function getAuthoredAtmosphereRecallLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    ATMOSPHERE_RECALL[seed % ATMOSPHERE_RECALL.length],
    `${id.tone} · atmosphere preserved`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicSessionContinuityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    SESSION_CONTINUITY[seed % SESSION_CONTINUITY.length],
    `${id.pacing} · continuity held`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalStoryPresenceLine(
  sceneIndex: number,
  style?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, null)
  const pool = [
    STORY_PRESENCE[seed % STORY_PRESENCE.length],
    `Beat ${sceneIndex} · ${id.label} story held`,
  ]
  return pool[seed % pool.length]
}

export function getVisualAuthorshipEchoLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    AUTHORSHIP_ECHO[seed % AUTHORSHIP_ECHO.length],
    `${id.rhythm} · authorship echo`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicMemoryDepthLine(
  sceneIndex: number,
  seed = 0
): string {
  const pool = [
    MEMORY_DEPTH[seed % MEMORY_DEPTH.length],
    `Memory depth · beat ${sceneIndex}`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicLegacyAtmosphereLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    LEGACY_ATMOSPHERE[seed % LEGACY_ATMOSPHERE.length],
    `${id.tone} · legacy atmosphere`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalWorldPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    WORLD_PRESENCE[seed % WORLD_PRESENCE.length],
    `${id.label} worlds · emotionally present`,
  ]
  return pool[seed % pool.length]
}

export function getAuthoredMemoryAtmosphereLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    MEMORY_ATMOSPHERE[seed % MEMORY_ATMOSPHERE.length],
    `${id.label} · memory atmosphere`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicPreservationRhythmLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    PRESERVATION_RHYTHM[seed % PRESERVATION_RHYTHM.length],
    `${id.rhythm} · preservation held`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalProjectContinuityLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    'Emotional project continuity held.',
    'Your cinematic arc remembered.',
    `Continuity · beat ${sceneIndex} of ${totalScenes}`,
  ]
  return pool[seed % pool.length]
}

export function getAuthoredArchiveAtmosphereLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    `${id.tone} · preserved.`,
    'Authored worlds rest in quiet permanence.',
    `${id.rhythm} · atmospherically held`,
  ]
  return pool[seed % pool.length]
}

export function getStorytellingOwnershipLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    'Storytelling ownership endures.',
    'Your narrative worlds remain yours.',
    `${id.pacing} · ownership preserved`,
  ]
  return pool[seed % pool.length]
}

export function getArchiveMemoryEchoLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    'Your cinematic worlds remembered.',
    'Authored worlds echo through time.',
    `${id.tone} · memory echo`,
  ]
  return pool[seed % pool.length]
}

export function getLegacyContinuityLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  if (sceneIndex <= 1) return 'Legacy world opening'
  if (sceneIndex >= totalScenes) return 'Legacy world closure'
  const pool = [
    'Legacy continuity uninterrupted.',
    'Your worlds bridge across sessions.',
    'Cinematic legacy carries forward.',
  ]
  return pool[seed % pool.length]
}

export function getExportLegacyArchiveLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_LEGACY_PRIMARY[seed % EXPORT_LEGACY_PRIMARY.length],
    `${id.label} cinematic worlds preserved`,
  ]
  return pool[seed % pool.length]
}

export function getExportLegacyArchiveSecondaryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_LEGACY_SECONDARY[seed % EXPORT_LEGACY_SECONDARY.length],
    `${id.tone} · legacy endures`,
  ]
  return pool[seed % pool.length]
}

export function getExportAuthorshipLegacyLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_AUTHORSHIP_LEGACY[seed % EXPORT_AUTHORSHIP_LEGACY.length],
    `${id.label} authorship legacy held`,
  ]
  return pool[seed % pool.length]
}

export function getLegacyArchiveHeadline(
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneCount <= 0) return `${id.label} worlds forming`
  return `Your cinematic worlds · ${sceneCount} beat legacy`
}
