import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'

const VIEWING_ANCHOR = [
  'Your cinematic sequence is ready to be experienced.',
  'Your cinematic world can now be experienced.',
  'Visual storytelling presence preserved.',
] as const

const PLAYBACK_PRESENCE = [
  'Atmospheric pacing remains intact through viewing.',
  'Emotional playback atmosphere calm.',
  'Cinematic viewing presence held.',
] as const

const VIEWING_ENVIRONMENT = [
  'Cinematic atmosphere preserved.',
  'Visual storytelling flows naturally.',
  'Emotional pacing remains uninterrupted.',
] as const

const SHOWCASE_PRESENCE = [
  'Cinematic showcase atmosphere aligned.',
  'Premium presentation identity held.',
  'Intentional viewing immersion steady.',
] as const

const VIEWING_ATMOSPHERE = [
  'Emotional viewing atmosphere immersive.',
  'Visual story showcase calm.',
  'Cinematic premiere mood restrained.',
] as const

const STORY_SHOWCASE = [
  'Visual storytelling flows naturally.',
  'Emotional story presentation preserved.',
  'Showcase atmosphere editorially held.',
] as const

const PLAYBACK_FLOW = [
  'Emotional progression preserved through viewing.',
  'Cinematic rhythm uninterrupted.',
  'Visual sequence flows atmospherically.',
] as const

const VIEWING_RHYTHM = [
  'Emotional viewing rhythm steady.',
  'Cinematic pacing atmospherically held.',
  'Visual beat flow preserved.',
] as const

const SEQUENCE_PLAYBACK = [
  'Visual sequence playback atmosphere calm.',
  'Cinematic sequence emotionally presentable.',
  'Story beats flow with intention.',
] as const

const ATMOSPHERE_VIEWING = [
  'Atmosphere viewing immersion held.',
  'Emotional cinematic continuity preserved.',
  'Visual mood uninterrupted.',
] as const

const VIEWING_MEMORY = [
  'Your cinematic atmosphere remains recognizable.',
  'Visual storytelling identity preserved.',
  'Emotional presentation continuity maintained.',
] as const

const SHOWCASE_RECALL = [
  'Emotional showcase recall gentle.',
  'Presentation identity atmospherically held.',
  'Cinematic viewing memory preserved.',
] as const

const STORY_PRESENCE_MEMORY = [
  'Visual story presence memory steady.',
  'Authored showcase atmosphere remembered.',
  'Emotional viewing identity held.',
] as const

const ATMOSPHERE_RETENTION = [
  'Cinematic atmosphere retention calm.',
  'Emotional viewing continuity preserved.',
  'Presentation atmosphere enduring.',
] as const

const PLAYBACK_FOCUS = [
  'Emotional playback focus restrained.',
  'Cinematic viewing depth editorial.',
  'Visual immersion calmly held.',
] as const

const SHOWCASE_DEPTH = [
  'Immersive showcase depth subtle.',
  'Presentation-ready cinematic framing.',
  'Emotional visual focus preserved.',
] as const

const SEQUENCE_VIEW = [
  'Cinematic sequence view atmosphere held.',
  'Visual story sequence presentable.',
  'Emotional beats viewable with intention.',
] as const

const PREMIERE_LAYER = [
  'Cinematic premiere atmosphere calm.',
  'Emotionally immersive presentation held.',
  'Creator-presented viewing mood steady.',
] as const

const EXPORT_VIEWING_PRIMARY = [
  'Your cinematic world is ready to be experienced.',
  'Visual storytelling atmosphere preserved through presentation.',
  'Emotional cinematic continuity now lives beyond creation.',
] as const

const EXPORT_VIEWING_SECONDARY = [
  'Cinematic presentation permanence held.',
  'Emotional showcase continuity preserved.',
  'Your authored world is presentable.',
] as const

const EXPORT_VIEWING_TERTIARY = [
  'Viewing readiness atmospherically complete.',
  'Creator presentation confidence preserved.',
  'Immersive showcase identity held.',
] as const

const GLOBAL_PRESENTATION = [
  'Your cinematic world can be experienced beautifully.',
  'Emotionally immersive presentation ready.',
  'Visual storytelling viewable with calm confidence.',
] as const

const PREMIERE_RHYTHM = [
  'Cinematic premiere rhythm steady.',
  'Emotional presentation breathing calm.',
  'Viewing atmosphere editorially held.',
] as const

export function getViewingAnchorLine(
  sceneIndex: number,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    VIEWING_ANCHOR[seed % VIEWING_ANCHOR.length],
    `Beat ${sceneIndex} · ${id.label} presentable`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalPlaybackPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    PLAYBACK_PRESENCE[seed % PLAYBACK_PRESENCE.length],
    `${id.tone} · playback held`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicViewingEnvironmentLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    VIEWING_ENVIRONMENT[seed % VIEWING_ENVIRONMENT.length],
    `${id.rhythm} · viewing preserved`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicShowcasePresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [SHOWCASE_PRESENCE[seed % SHOWCASE_PRESENCE.length]]
  return pool[0]
}

export function getEmotionalViewingAtmosphereLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    VIEWING_ATMOSPHERE[seed % VIEWING_ATMOSPHERE.length],
    `${id.tone} · viewing atmosphere`,
  ]
  return pool[seed % pool.length]
}

export function getVisualStoryShowcaseLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    STORY_SHOWCASE[seed % STORY_SHOWCASE.length],
    `${id.pacing} · showcase held`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicPlaybackFlowLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    PLAYBACK_FLOW[seed % PLAYBACK_FLOW.length],
    `Viewing flow · beat ${sceneIndex} of ${totalScenes}`,
  ]
  return pool[seed % pool.length]
}

export function getEmotionalViewingRhythmLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    VIEWING_RHYTHM[seed % VIEWING_RHYTHM.length],
    `${id.rhythm} · viewing rhythm`,
  ]
  return pool[seed % pool.length]
}

export function getVisualSequencePlaybackLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [SEQUENCE_PLAYBACK[seed % SEQUENCE_PLAYBACK.length]]
  return pool[0]
}

export function getCinematicAtmosphereViewingLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    ATMOSPHERE_VIEWING[seed % ATMOSPHERE_VIEWING.length],
    `${id.tone} · atmosphere viewing`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicViewingMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [VIEWING_MEMORY[seed % VIEWING_MEMORY.length]]
  return pool[0]
}

export function getEmotionalShowcaseRecallLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [SHOWCASE_RECALL[seed % SHOWCASE_RECALL.length]]
  return pool[0]
}

export function getVisualStoryPresenceMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    STORY_PRESENCE_MEMORY[seed % STORY_PRESENCE_MEMORY.length],
    `${id.label} · story presence`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicAtmosphereRetentionLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [ATMOSPHERE_RETENTION[seed % ATMOSPHERE_RETENTION.length]]
  return pool[0]
}

export function getEmotionalPlaybackFocusLine(
  sceneIndex: number,
  seed = 0
): string {
  const pool = [
    PLAYBACK_FOCUS[seed % PLAYBACK_FOCUS.length],
    `Focus · beat ${sceneIndex}`,
  ]
  return pool[seed % pool.length]
}

export function getImmersiveShowcaseDepthLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    SHOWCASE_DEPTH[seed % SHOWCASE_DEPTH.length],
    `${id.tone} · showcase depth`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicSequenceViewLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  const pool = [
    SEQUENCE_VIEW[seed % SEQUENCE_VIEW.length],
    `Sequence view · ${sceneIndex} of ${totalScenes}`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicPremiereLayerLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [PREMIERE_LAYER[seed % PREMIERE_LAYER.length]]
  return pool[0]
}

export function getExportViewingPrimaryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  const pool = [
    EXPORT_VIEWING_PRIMARY[seed % EXPORT_VIEWING_PRIMARY.length],
    `${id.label} · ready to experience`,
  ]
  return pool[seed % pool.length]
}

export function getExportViewingSecondaryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [EXPORT_VIEWING_SECONDARY[seed % EXPORT_VIEWING_SECONDARY.length]]
  return pool[0]
}

export function getExportViewingTertiaryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [EXPORT_VIEWING_TERTIARY[seed % EXPORT_VIEWING_TERTIARY.length]]
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
    `${id.label} · presentable`,
  ]
  return pool[seed % pool.length]
}

export function getCinematicPremiereRhythmLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const pool = [PREMIERE_RHYTHM[seed % PREMIERE_RHYTHM.length]]
  return pool[0]
}

export function getCinematicDeliveryHeadline(
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (sceneCount <= 0) return `${id.label} presentation forming`
  return `Ready to experience · ${sceneCount} beat showcase`
}

export function getCinematicViewingRouteLine(
  stage: string,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  if (stage === 'compile' || stage === 'export') {
    return getExportViewingPrimaryLine(style, niche, seed)
  }
  if (stage === 'preview') {
    return `Your ${id.label.toLowerCase()} draft is ready to be experienced.`
  }
  return VIEWING_ANCHOR[seed % VIEWING_ANCHOR.length]
}
