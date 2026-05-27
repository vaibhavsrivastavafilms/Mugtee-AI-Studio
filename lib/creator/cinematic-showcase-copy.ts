import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'

const SHARING_ANCHOR = [
  'Your cinematic world is ready to be experienced beyond creation.',
  'Your cinematic worlds can now be shared as experiences.',
  'Visual storytelling identity travels intact.',
] as const

const EMOTIONAL_SHARING = [
  'Atmospheric continuity remains preserved through presentation.',
  'Emotional showcase atmosphere calm.',
  'Creator-owned presentation held.',
] as const

const PRESENTATION_ENV = [
  'Cinematic presentation environment aligned.',
  'Showcase atmosphere editorially restrained.',
  'Immersive presentation identity steady.',
] as const

const HANDOFF_PRESENCE = [
  'Atmospheric pacing remains uninterrupted.',
  'Your cinematic rhythm carries forward.',
  'Visual storytelling atmosphere remains intact.',
] as const

const VIEWER_TRANSITION = [
  'Emotional viewer transition gentle.',
  'Cinematic handoff atmosphere calm.',
  'Presentation continuity preserved.',
] as const

const STORY_TRANSFER = [
  'Visual story transfer atmospherically held.',
  'Emotional narrative carries outward.',
  'Authored story presence preserved.',
] as const

const SHOWCASE_FLOW = [
  'Cinematic showcase flow steady.',
  'Presentation rhythm uninterrupted.',
  'Showcase atmosphere continuous.',
] as const

const SHOWCASE_RHYTHM = [
  'Cinematic showcase rhythm held.',
  'Emotional presentation pacing calm.',
  'Visual beat flow preserved.',
] as const

const PRESENTATION_FLOW = [
  'Emotional presentation flow steady.',
  'Cinematic showcase continuity held.',
  'Atmosphere flows with intention.',
] as const

const VIEWING_THREAD = [
  'Visual story viewing thread intact.',
  'Emotional sequencing preserved through showcase.',
  'Cinematic thread atmospherically held.',
] as const

const AUDIENCE_PRESENCE = [
  'Cinematic audience presence implied.',
  'Emotional immersion travels quietly.',
  'Showcase atmosphere creator-owned.',
] as const

const SHOWCASE_MEMORY = [
  'Your cinematic presentation identity remains recognizable.',
  'Visual storytelling continuity preserved.',
  'Atmospheric pacing carries forward naturally.',
] as const

const VIEWING_RECALL = [
  'Emotional viewing recall gentle.',
  'Showcase identity atmospherically held.',
  'Presentation memory preserved.',
] as const

const STORY_PRESERVATION = [
  'Visual story preservation steady.',
  'Authored atmosphere carries outward.',
  'Emotional story permanence calm.',
] as const

const ATMOSPHERE_CONTINUITY = [
  'Cinematic atmosphere continuity held.',
  'Emotional showcase thread uninterrupted.',
  'Presentation atmosphere enduring.',
] as const

const PRESENTATION_FOCUS = [
  'Emotional presentation focus restrained.',
  'Showcase composition editorial.',
  'Cinematic visual focus preserved.',
] as const

const STORY_PRESENCE = [
  'Cinematic story presence shareable.',
  'Emotional narrative atmospherically framed.',
  'Visual story showcase-ready.',
] as const

const SHARING_ATMOSPHERE = [
  'Cinematic sharing atmosphere calm.',
  'Emotionally presentable mood held.',
  'Premiere sharing identity steady.',
] as const

const EXPORT_SHOWCASE_PRIMARY = [
  'Your cinematic world is ready to be experienced beyond authorship.',
  'Visual storytelling atmosphere remains intact through presentation.',
  'Your cinematic identity now carries outward.',
] as const

const EXPORT_SHOWCASE_SECONDARY = [
  'Cinematic sharing permanence held.',
  'Emotional presentation continuity preserved.',
  'Showcase readiness atmospherically complete.',
] as const

const EXPORT_SHOWCASE_TERTIARY = [
  'Presentation identity travels intact.',
  'Emotional showcase continuity endures.',
  'Creator-owned cinematic handoff complete.',
] as const

const GLOBAL_PRESENTATION = [
  'Your cinematic worlds can be beautifully experienced and shared.',
  'Emotionally immersive showcase ready.',
  'Presentation atmosphere creator-owned.',
] as const

const PREMIERE_CONTINUITY = [
  'Cinematic premiere continuity held.',
  'Emotional showcase breathing calm.',
  'Presentation rhythm editorially steady.',
] as const

export function getSharingAnchorLine(
  sceneIndex: number,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    SHARING_ANCHOR[seed % SHARING_ANCHOR.length],
    `Beat ${sceneIndex} · ${id.label} presentable outward`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalSharingPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EMOTIONAL_SHARING[seed % EMOTIONAL_SHARING.length],
    `${id.tone} · sharing held`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicPresentationEnvironmentLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [PRESENTATION_ENV[seed % PRESENTATION_ENV.length]]
  return pool[0]
}

export function getCinematicHandoffPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    HANDOFF_PRESENCE[seed % HANDOFF_PRESENCE.length],
    `${id.rhythm} · handoff calm`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalViewerTransitionLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [VIEWER_TRANSITION[seed % VIEWER_TRANSITION.length]]
  return pool[0]
}

export function getVisualStoryTransferLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    STORY_TRANSFER[seed % STORY_TRANSFER.length],
    `${id.pacing} · story travels`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicShowcaseFlowLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    SHOWCASE_FLOW[seed % SHOWCASE_FLOW.length],
    `Showcase flow · beat ${sceneIndex} of ${totalScenes}`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicShowcaseRhythmLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    SHOWCASE_RHYTHM[seed % SHOWCASE_RHYTHM.length],
    `${id.rhythm} · showcase rhythm`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalPresentationFlowLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [PRESENTATION_FLOW[seed % PRESENTATION_FLOW.length]]
  return pool[0]
}

export function getVisualStoryViewingThreadLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    VIEWING_THREAD[seed % VIEWING_THREAD.length],
    `Viewing thread · ${sceneIndex} of ${totalScenes}`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicAudiencePresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [AUDIENCE_PRESENCE[seed % AUDIENCE_PRESENCE.length]]
  return pool[0]
}

export function getCinematicShowcaseMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [SHOWCASE_MEMORY[seed % SHOWCASE_MEMORY.length]]
  return pool[0]
}

export function getEmotionalViewingRecallLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [VIEWING_RECALL[seed % VIEWING_RECALL.length]]
  return pool[0]
}

export function getVisualStoryPreservationLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    STORY_PRESERVATION[seed % STORY_PRESERVATION.length],
    `${id.label} · story preserved`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicAtmosphereContinuityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [ATMOSPHERE_CONTINUITY[seed % ATMOSPHERE_CONTINUITY.length]]
  return pool[0]
}

export function getEmotionalPresentationFocusLine(
  sceneIndex: number,
  seed = 0
): string {
  const pool = [
    PRESENTATION_FOCUS[seed % PRESENTATION_FOCUS.length],
    `Focus · beat ${sceneIndex}`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicStoryPresenceLine(
  sceneIndex: number,
  style?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, null)
  const pool = [
    STORY_PRESENCE[seed % STORY_PRESENCE.length],
    `Beat ${sceneIndex} · ${id.label} story shareable`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicSharingAtmosphereLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [SHARING_ATMOSPHERE[seed % SHARING_ATMOSPHERE.length]]
  return pool[0]
}

export function getExportShowcasePrimaryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_SHOWCASE_PRIMARY[seed % EXPORT_SHOWCASE_PRIMARY.length],
    `${id.label} · ready to carry outward`,
  ]
  return pool[seed % pool.length]
}

export function getExportShowcaseSecondaryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [EXPORT_SHOWCASE_SECONDARY[seed % EXPORT_SHOWCASE_SECONDARY.length]]
  return pool[0]
}

export function getExportShowcaseTertiaryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [EXPORT_SHOWCASE_TERTIARY[seed % EXPORT_SHOWCASE_TERTIARY.length]]
  return pool[0]
}

export function getEmotionalPresentationPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    GLOBAL_PRESENTATION[seed % GLOBAL_PRESENTATION.length],
    `${id.label} · showcase ready`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicPremiereContinuityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [PREMIERE_CONTINUITY[seed % PREMIERE_CONTINUITY.length]]
  return pool[0]
}

export function getCinematicShowcaseHeadline(
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneCount <= 0) return `${id.label} showcase forming`
  return `Shareable as experience · ${sceneCount} beat showcase`
}

export function getCinematicShowcaseRouteLine(
  stage: string,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (stage === 'compile' || stage === 'export') {
    return getExportShowcasePrimaryLine(style, niche, seed)
  }
  if (stage === 'preview') {
    return `Your ${id.label.toLowerCase()} world can be shared as an experience.`
  }
  return SHARING_ANCHOR[seed % SHARING_ANCHOR.length]
}
