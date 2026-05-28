import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'

function poolLine(pool: readonly string[], seed: number, suffix?: string): string {
  const base = pool[seed % pool.length]
  return suffix ? `${base} · ${suffix}` : base
}

// ── Phase 5.1 — Live Cinematic Motion ─────────────────────────────────────
const MOTION_MOBILE = [
  'My cinematic worlds are beginning to move.',
  'Emotional motion atmosphere held.',
  'Cinematic scene movement calm.',
] as const

const MOTION_PRESENCE = [
  'Cinematic motion continuity steady.',
  'Emotional motion atmosphere fluid.',
  'Scene movement atmospherically restrained.',
] as const

const SCENE_MOTION = [
  'Subtle scene movement emotionally paced.',
  'Cinematic pacing playback held.',
  'Visual transition immersion calm.',
] as const

const MOTION_RHYTHM = [
  'Emotionally directed motion rhythm.',
  'Cinematic transition presence steady.',
  'Visual motion continuity preserved.',
] as const

const EXPORT_MOTION = [
  'Live cinematic motion readiness held.',
  'Emotional scene flow atmospherically intact.',
  'Motion continuity preserved outward.',
] as const

// ── Phase 6 — Live Video Generation ───────────────────────────────────────
const VIDEO_PRESENCE = [
  'My cinematic worlds become living film.',
  'Cinematic scenes held in emotional coherence.',
  'Visual atmosphere preserved through the arc.',
] as const

const RENDER_PRESENCE = [
  'Emotional shot continuity steady.',
  'Cinematic pacing held in calm.',
  'Screenplay rhythm carried into frame.',
] as const

const FILM_FLOW = [
  'Emotional film flow uninterrupted.',
  'Cinematic visual rhythm preserved.',
  'Directed scenes atmospherically alive.',
] as const

const EXPORT_VIDEO = [
  'Living cinematic film readiness held.',
  'Emotional visual sequencing intact.',
  'Cinematic shot continuity preserved.',
] as const

// ── Phase 6.5 — Voice & Sound Cinema ──────────────────────────────────────
const AUDIO_PRESENCE = [
  'My cinematic worlds now breathe emotionally.',
  'Cinematic sound atmosphere held.',
  'Immersive emotional audio design calm.',
] as const

const VOICE_PRESENCE = [
  'Emotionally cinematic voiceover steady.',
  'Pacing-aware voice rhythm held.',
  'Cinematic sound continuity preserved.',
] as const

const NARRATION_FLOW = [
  'Emotional narration flow uninterrupted.',
  'Cinematic audio pacing calm.',
  'Immersive sound sequence held.',
] as const

const EXPORT_AUDIO = [
  'Emotional voice atmosphere preserved outward.',
  'Cinematic audio continuity intact.',
  'Immersive sound readiness held.',
] as const

// ── Phase 7 — Live Film Experience ──────────────────────────────────────────
const FILM_EXPERIENCE = [
  'I emotionally experience my cinematic worlds as living film.',
  'Immersive cinematic playback held.',
  'Emotional viewing immersion steady.',
] as const

const PLAYBACK_PRESENCE = [
  'Film-like presentation calm.',
  'Atmosphere-aware viewing continuity.',
  'Emotional scene transitions restrained.',
] as const

const EXPORT_FILM = [
  'Live cinematic film experience readiness held.',
  'Emotional playback continuity preserved.',
  'Immersive viewing atmosphere intact.',
] as const

// ── Phase 8 — Cinematic Distribution ────────────────────────────────────────
const DISTRIBUTION = [
  'My cinematic worlds travel emotionally across audiences.',
  'Cinematic delivery experience held.',
  'Immersive showcase delivery calm.',
] as const

const AUDIENCE_IMMERSION = [
  'Emotional audience immersion steady.',
  'Storytelling presentation continuity held.',
  'Cinematic viewing handoff preserved.',
] as const

const EXPORT_DISTRIBUTION = [
  'Cinematic distribution readiness held.',
  'Emotional presentation continuity intact.',
  'Showcase delivery atmosphere preserved.',
] as const

// ── Phase 9 — Live Storytelling Ecosystem ───────────────────────────────────
const ECOSYSTEM = [
  'My cinematic storytelling life evolves here.',
  'Emotional world evolution steady.',
  'Immersive universe continuity held.',
] as const

const WORLD_EVOLUTION = [
  'Cinematic emotional permanence calm.',
  'Creator storytelling identity persistence held.',
  'Living storytelling ecosystem atmosphere steady.',
] as const

const EXPORT_ECOSYSTEM = [
  'Living cinematic storytelling ecosystem preserved.',
  'Emotional world evolution continuity intact.',
  'Universe persistence held outward.',
] as const

// ── Phase 10 — Final Operating System ───────────────────────────────────────
const FINAL_OS = [
  'I direct emotionally immersive cinematic worlds from imagination to final film.',
  'Definitive cinematic storytelling operating continuity.',
  'Emotionally coherent creation held.',
] as const

const FINAL_INFRA = [
  'Live cinematic storytelling environment calm.',
  'Emotionally intelligent creation steady.',
  'Creator cinematic permanence held.',
] as const

const EXPORT_FINAL = [
  'From idea to living film — emotionally coherent.',
  'Cinematic storytelling operating system complete.',
  'Authored worlds persist across creation.',
] as const

// ── Getters ─────────────────────────────────────────────────────────────────
export function getMotionMobileLine(
  sceneIndex: number,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(MOTION_MOBILE, seed + sceneIndex, id.label)
}

export function getEmotionalMotionPresenceLine(
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(MOTION_PRESENCE, seed, id.label)
}

export function getCinematicSceneMotionLine(
  sceneIndex: number,
  style?: string | null,
  seed = 0
): string {
  return poolLine(SCENE_MOTION, seed + sceneIndex, style ?? 'directed')
}

export function getCinematicMotionRhythmLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  return poolLine(MOTION_RHYTHM, seed, `${sceneIndex + 1}/${totalScenes} motion`)
}

export function getEmotionalSceneFlowLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(SCENE_MOTION, seed + 1, id.label)
}

export function getCinematicTransitionPresenceLine(seed = 0): string {
  return poolLine(MOTION_RHYTHM, seed + 2)
}

export function getVisualMotionContinuityLine(
  sceneIndex: number,
  totalScenes: number,
  seed = 0
): string {
  return poolLine(MOTION_RHYTHM, seed, `continuity ${sceneIndex + 1}/${totalScenes}`)
}

export function getEmotionalRenderPresenceLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(RENDER_PRESENCE, seed, id.label)
}

export function getCinematicShotGenerationLine(sceneIndex: number, style?: string | null, seed = 0): string {
  return poolLine(VIDEO_PRESENCE, seed + sceneIndex, style ?? 'shot')
}

export function getEmotionalFilmFlowLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(FILM_FLOW, seed, id.label)
}

export function getCinematicVisualRhythmLine(sceneIndex: number, totalScenes: number, seed = 0): string {
  return poolLine(FILM_FLOW, seed, `${sceneIndex + 1}/${totalScenes} rhythm`)
}

export function getEmotionalVoicePresenceLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(VOICE_PRESENCE, seed, id.label)
}

export function getCinematicSoundAtmosphereLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(AUDIO_PRESENCE, seed, id.label)
}

export function getEmotionalNarrationFlowLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(NARRATION_FLOW, seed)
}

export function getCinematicAudioPacingLine(sceneIndex: number, totalScenes: number, seed = 0): string {
  return poolLine(NARRATION_FLOW, seed, `${sceneIndex + 1}/${totalScenes} audio`)
}

export function getFilmExperienceLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(FILM_EXPERIENCE, seed, id.label)
}

export function getPlaybackPresenceLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(PLAYBACK_PRESENCE, seed)
}

export function getDistributionLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(DISTRIBUTION, seed, id.label)
}

export function getAudienceImmersionLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(AUDIENCE_IMMERSION, seed)
}

export function getEcosystemLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(ECOSYSTEM, seed, id.label)
}

export function getWorldEvolutionLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(WORLD_EVOLUTION, seed)
}

export function getFinalOperatingLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(FINAL_OS, seed, id.label)
}

export function getFinalInfrastructureLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(FINAL_INFRA, seed)
}

export function getExportMotionLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(EXPORT_MOTION, seed, id.label)
}

export function getExportVideoLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(EXPORT_VIDEO, seed)
}

export function getExportAudioLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(EXPORT_AUDIO, seed)
}

export function getExportFilmLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(EXPORT_FILM, seed)
}

export function getExportDistributionLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(EXPORT_DISTRIBUTION, seed)
}

export function getExportEcosystemLine(style?: string | null, niche?: string | null, seed = 0): string {
  return poolLine(EXPORT_ECOSYSTEM, seed)
}

export function getExportFinalLine(style?: string | null, niche?: string | null, seed = 0): string {
  const id = resolveCreatorIdentity(style, niche)
  return poolLine(EXPORT_FINAL, seed, id.label)
}

export function getLiveCinematicHeadline(
  phase: 'motion' | 'film' | 'audio' | 'experience' | 'distribution' | 'ecosystem' | 'final',
  sceneCount: number,
  style?: string | null,
  niche?: string | null
): string {
  const id = resolveCreatorIdentity(style, niche)
  const n = sceneCount > 0 ? `${sceneCount} beat` : 'forming'
  const map = {
    motion: `Live motion · ${n} cinematic movement`,
    film: `Living film · ${n} directed scenes`,
    audio: `Emotional breath · ${n} voice atmosphere`,
    experience: `Film experience · ${n} immersive playback`,
    distribution: `Emotional travel · ${n} presentation arc`,
    ecosystem: `${id.label} universe · ${n} evolving worlds`,
    final: `Idea to film · ${n} operating arc`,
  }
  return map[phase]
}

export function getLiveCinematicRouteLine(
  stage: string,
  style?: string | null,
  niche?: string | null,
  seed = 0
): string {
  if (stage === 'compile' || stage === 'export') {
    return getExportFinalLine(style, niche, seed)
  }
  if (stage === 'preview') {
    return getFilmExperienceLine(style, niche, seed)
  }
  return FINAL_OS[seed % FINAL_OS.length]
}
