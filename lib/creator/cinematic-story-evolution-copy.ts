import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'

// ── Phase 4.2 — Story Experience ──────────────────────────────────────────
const STORY_EXPERIENCE_MOBILE = [
  'My cinematic worlds can now emotionally surround viewers.',
  'Emotionally immersive story experience held.',
  'Cinematic atmosphere surrounds the viewer quietly.',
] as const

const VIEWING_IMMERSION = [
  'Emotionally surrounding atmosphere calm.',
  'Cinematically immersive presence held.',
  'Visual story absorption uninterrupted.',
] as const

const EMOTIONAL_ABSORPTION = [
  'Emotional sequence absorption steady.',
  'Atmosphere pulls inward with restraint.',
  'Cinematic emotional continuity held.',
] as const

const STORY_RHYTHM = [
  'Cinematic story rhythm uninterrupted.',
  'Emotional viewing rhythm steady.',
  'Atmosphere-aware pacing preserved.',
] as const

const NARRATIVE_PRESENCE = [
  'Cinematic narrative presence alive.',
  'Emotional story viewing calm.',
  'Visual sequence atmospherically coherent.',
] as const

const STORY_MEMORY = [
  'Emotional continuity preserved through viewing.',
  'Cinematic story persistence held.',
  'Authored viewing identity steady.',
] as const

const EXPORT_STORY_EXPERIENCE = [
  'Your cinematic world can now emotionally surround others.',
  'Immersive narrative readiness atmospherically held.',
  'Emotional story immersion continuity preserved.',
] as const

// ── Phase 4.3 — Storytelling Continuity ───────────────────────────────────
const UNIVERSE_CONTINUITY = [
  'My cinematic stories belong to a living emotional universe.',
  'Emotional story ecosystem continuity held.',
  'Cinematic thematic thread uninterrupted.',
] as const

const STORY_THREAD = [
  'Emotional story thread carries forward.',
  'Narrative atmosphere unified quietly.',
  'Cinematic world continuity preserved.',
] as const

const STORY_EVOLUTION = [
  'Storytelling identity evolving calmly.',
  'Emotional authorship continuity held.',
  'Visual story growth atmospherically steady.',
] as const

const EXPORT_CONTINUITY = [
  'Living emotional universe continuity preserved.',
  'Cinematic narrative threading intact.',
  'Story ecosystem atmosphere held.',
] as const

// ── Phase 4.4 — Storytelling Identity ─────────────────────────────────────
const STORYTELLING_IDENTITY = [
  'My cinematic storytelling voice exists here.',
  'Emotionally authored voice recognizable.',
  'Visual storytelling signature steady.',
] as const

const STORY_VOICE = [
  'Cinematic story voice emotionally identifiable.',
  'Authorship tone atmospherically held.',
  'Visual story language uniquely yours.',
] as const

const IDENTITY_MEMORY = [
  'Storytelling identity continuity preserved.',
  'Cinematic voice persistence held.',
  'Emotional authorship memory calm.',
] as const

const EXPORT_IDENTITY = [
  'Creator storytelling identity preserved outward.',
  'Emotional story signature travels intact.',
  'Cinematic authorship voice held.',
] as const

// ── Phase 4.5 — Story Universe ────────────────────────────────────────────
const UNIVERSE_PRESENCE = [
  'My cinematic storytelling universe lives here.',
  'Emotionally connected authored worlds held.',
  'Cinematic universe atmosphere unified.',
] as const

const UNIVERSE_GROWTH = [
  'Cinematic universe evolving quietly.',
  'Emotional world continuity enduring.',
  'Visual universe thread atmospherically held.',
] as const

const EXPORT_UNIVERSE = [
  'Living cinematic storytelling universe preserved.',
  'Emotional world network continuity held.',
  'Authored universe atmosphere complete.',
] as const

// ── Phase 5 — Storytelling Operating System ───────────────────────────────
const OPERATING_PRESENCE = [
  'My emotional cinematic storytelling life exists here.',
  'Storytelling operating continuity calm.',
  'Cinematically grounded authorship held.',
] as const

const OPERATING_INFRASTRUCTURE = [
  'Emotional storytelling infrastructure steady.',
  'Cinematic universe persistence held.',
  'Immersive authorship layer calm.',
] as const

const STORYTELLING_EVOLUTION = [
  'Emotionally evolving cinematic storytelling.',
  'Authored worlds expanding quietly.',
  'Visual storytelling universe continuous.',
] as const

const EXPORT_OPERATING = [
  'Cinematic storytelling operating continuity complete.',
  'Emotional universe permanence held through presentation.',
  'Creator storytelling life atmospherically preserved.',
] as const

function poolLine(pool: readonly string[], seed: number, tailored?: string) {
  const lines = tailored ? [tailored, pool[seed % pool.length]] : [pool[seed % pool.length]]
  return lines[seed % lines.length]
}

export function getStoryExperienceMobileLine(
  sceneIndex: number,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORY_EXPERIENCE_MOBILE, seed, `Beat ${sceneIndex} · ${id.label} surrounds`)
}

export function getEmotionalViewingImmersionLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(VIEWING_IMMERSION, seed, `${id.tone} · immersion held`)
}

export function getEmotionalSequenceAbsorptionLine(seed = 0): string {
  return EMOTIONAL_ABSORPTION[seed % EMOTIONAL_ABSORPTION.length]
}

export function getVisualAtmosphereFlowLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORY_RHYTHM, seed, `${id.rhythm} · atmosphere flow`)
}

export function getCinematicStoryRhythmLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  return poolLine(STORY_RHYTHM, seed, `Story rhythm · ${sceneIndex} of ${totalScenes}`)
}

export function getCinematicNarrativePresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(NARRATIVE_PRESENCE, seed)
}

export function getEmotionalStoryViewingLine(
  sceneIndex: number,
  style?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, null)
  return poolLine(NARRATIVE_PRESENCE, seed, `Beat ${sceneIndex} · ${id.label} story viewing`)
}

export function getCinematicAtmosphereImmersionLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(VIEWING_IMMERSION, seed + 1, `${id.tone} · atmosphere immersion`)
}

export function getVisualEmotionalSequenceLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  return poolLine(EMOTIONAL_ABSORPTION, seed, `Emotional sequence · ${sceneIndex}/${totalScenes}`)
}

export function getCinematicStoryMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(STORY_MEMORY, seed)
}

export function getEmotionalAtmosphereRecallLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORY_MEMORY, seed + 1, `${id.tone} · atmosphere recall`)
}

export function getVisualStoryPreservationLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORY_MEMORY, seed + 2, `${id.pacing} · story preserved`)
}

export function getCinematicNarrativeContinuityLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  return poolLine(STORY_MEMORY, seed, `Narrative continuity · beat ${sceneIndex} of ${totalScenes}`)
}

export function getExportStoryExperienceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(EXPORT_STORY_EXPERIENCE, seed, `${id.label} · surrounds emotionally`)
}

export function getExportStoryExperienceSecondaryLine(seed = 0): string {
  return EXPORT_STORY_EXPERIENCE[(seed + 1) % EXPORT_STORY_EXPERIENCE.length]
}

export function getStoryContinuityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(UNIVERSE_CONTINUITY, seed, `${id.label} · universe continuity`)
}

export function getEmotionalStoryThreadLine(
  sceneIndex: number,
  style?: string | null,
  seed = 0
): string {
  return poolLine(STORY_THREAD, seed, `Story thread · beat ${sceneIndex}`)
}

export function getCinematicWorldContinuityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORY_THREAD, seed + 1, `${id.rhythm} · world continuity`)
}

export function getCinematicUniverseThreadLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(UNIVERSE_CONTINUITY, seed)
}

export function getEmotionalStoryPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORY_THREAD, seed, `${id.tone} · story presence`)
}

export function getCinematicStoryEvolutionLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(STORY_EVOLUTION, seed)
}

export function getEmotionalAuthorshipContinuityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORY_EVOLUTION, seed + 1, `${id.label} · authorship continuity`)
}

export function getExportContinuityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(EXPORT_CONTINUITY, seed)
}

export function getStorytellingIdentityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORYTELLING_IDENTITY, seed, `${id.label} · storytelling identity`)
}

export function getEmotionalStorySignatureLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORYTELLING_IDENTITY, seed + 1, `${id.tone} · story signature`)
}

export function getCinematicAuthorshipVoiceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(STORY_VOICE, seed)
}

export function getCinematicStoryVoiceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(STORY_VOICE, seed + 1)
}

export function getEmotionalNarrativeRhythmLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(STORY_VOICE, seed, `${id.rhythm} · narrative rhythm`)
}

export function getStoryIdentityMemoryLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(IDENTITY_MEMORY, seed)
}

export function getExportIdentityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(EXPORT_IDENTITY, seed)
}

export function getUniversePresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(UNIVERSE_PRESENCE, seed, `${id.label} · universe lives here`)
}

export function getEmotionalWorldNetworkLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(UNIVERSE_PRESENCE, seed + 1)
}

export function getCinematicUniverseGrowthLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(UNIVERSE_GROWTH, seed)
}

export function getEmotionalWorldContinuityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(UNIVERSE_GROWTH, seed + 1, `${id.tone} · world continuity`)
}

export function getExportUniverseLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(EXPORT_UNIVERSE, seed)
}

export function getOperatingPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(OPERATING_PRESENCE, seed, `${id.label} · storytelling life`)
}

export function getStorytellingInfrastructureLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(OPERATING_INFRASTRUCTURE, seed)
}

export function getEmotionalUniverseContinuityLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(OPERATING_INFRASTRUCTURE, seed + 1, `${id.rhythm} · universe continuity`)
}

export function getCinematicStorytellingEvolutionLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  return poolLine(STORYTELLING_EVOLUTION, seed)
}

export function getExportOperatingLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(EXPORT_OPERATING, seed, `${id.label} · operating continuity`)
}

export function getStoryEvolutionHeadline(
  phase: 'experience' | 'continuity' | 'identity' | 'universe' | 'operating',
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  const n = sceneCount > 0 ? `${sceneCount} beat` : 'forming'
  const map = {
    experience: `Emotionally surrounds · ${n} story experience`,
    continuity: `Living universe · ${n} narrative thread`,
    identity: `${id.label} voice · ${n} storytelling identity`,
    universe: `Story universe · ${n} authored worlds`,
    operating: `Storytelling life · ${n} operating arc`,
  }
  return map[phase]
}

export function getStoryEvolutionRouteLine(
  stage: string,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  if (stage === 'compile' || stage === 'export') {
    return getExportOperatingLine(style, niche, seed)
  }
  if (stage === 'preview') {
    const id = resolveCreatorIdentity(style, niche)
    return `Your ${id.label.toLowerCase()} story can emotionally surround viewers.`
  }
  return OPERATING_PRESENCE[seed % OPERATING_PRESENCE.length]
}
