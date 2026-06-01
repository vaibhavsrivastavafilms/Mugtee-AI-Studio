import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import type { ContentBrief } from '@/lib/content-director/content-brief'
import type { ParsedCreatorIntent } from '@/lib/input-understanding/types'
import {
  selectVoiceProfile,
  voiceProfileById,
  type VoiceProfile,
  type VoiceProfileId,
} from '@/lib/voice/voiceProfiles'

/** Per-scene voice direction — stored on blueprint / workflow state. */
export type SceneVoiceDirection = {
  sceneId: string
  emotion: string
  pacing: 'slow' | 'measured' | 'brisk' | 'urgent'
  tension: number
  mood: string
  pausePoints: string[]
  emphasisWords: string[]
  narrationSpeed: number
  directionNote: string
}

export type VoiceDirectorInput = {
  scenes: GeneratedScene[]
  sceneBlueprints?: SceneBlueprint[]
  niche?: CinematicNiche | string
  tone?: string
  audienceType?: string
  contentBrief?: ContentBrief | null
  parsedIntent?: ParsedCreatorIntent | null
  voiceProfileId?: VoiceProfileId | string
  elevenLabsVoiceId?: string | null
}

export type VoiceDirectorPlan = {
  profile: VoiceProfile
  voiceId: string
  speakingStyle: string
  speed: number
  emphasis: string[]
  pauses: string[]
  sceneDirections: SceneVoiceDirection[]
}

const PACING_BY_ROLE: Record<string, SceneVoiceDirection['pacing']> = {
  hook: 'brisk',
  tension: 'measured',
  peak: 'slow',
  aftertaste: 'slow',
  bridge: 'measured',
  release: 'measured',
}

const TENSION_BY_ROLE: Record<string, number> = {
  hook: 0.7,
  tension: 0.85,
  peak: 0.95,
  aftertaste: 0.35,
  bridge: 0.55,
  release: 0.4,
}

function extractEmphasisWords(text: string): string[] {
  const words = text
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5)
  const scored = words.map((w) => ({
    w: w.toLowerCase(),
    score: /mistake|secret|never|always|truth|hidden|finally|silence|alone|wrong|right|fear|love|death|money|power/i.test(w)
      ? 2
      : 1,
  }))
  return [...new Set(scored.sort((a, b) => b.score - a.score).map((x) => x.w))].slice(0, 4)
}

function pauseBeforeWords(text: string, emphasis: string[]): string[] {
  const pauses: string[] = []
  for (const word of emphasis.slice(0, 3)) {
    const re = new RegExp(`\\b${word}\\b`, 'i')
    if (re.test(text)) pauses.push(word)
  }
  if (/\b(but|however|until|then|suddenly|finally)\b/i.test(text)) {
    const m = text.match(/\b(but|however|until|then|suddenly|finally)\b/i)
    if (m?.[0]) pauses.push(m[0].toLowerCase())
  }
  return [...new Set(pauses)]
}

function narrationSpeedForScene(
  profile: VoiceProfile,
  pacing: SceneVoiceDirection['pacing'],
  tension: number
): number {
  const base = profile.speed
  const pacingMod =
    pacing === 'slow' ? 0.88 : pacing === 'brisk' ? 1.06 : pacing === 'urgent' ? 1.12 : 1
  const tensionMod = 1 - (tension - 0.5) * 0.08
  return Math.round(base * pacingMod * tensionMod * 100) / 100
}

function directionNoteForScene(
  emotion: string,
  pacing: SceneVoiceDirection['pacing'],
  emphasis: string[],
  pauses: string[]
): string {
  const pauseHint =
    pauses.length > 0
      ? `Slow pause before “${pauses[0]}”`
      : pacing === 'slow'
        ? 'Lower tone, hold the line'
        : 'Natural cadence'
  const emphHint =
    emphasis.length > 0 ? ` — land “${emphasis.slice(0, 2).join('”, “')}”` : ''
  return `${emotion} — ${pauseHint}${emphHint}`
}

export function buildSceneVoiceDirection(
  scene: GeneratedScene,
  index: number,
  total: number,
  blueprint?: SceneBlueprint | null,
  profile?: VoiceProfile
): SceneVoiceDirection {
  const role = scenePacingRole(index + 1, total)
  const narrative = (
    scene.description ||
    scene.visualPrompt ||
    scene.title ||
    ''
  ).trim()
  const emotion =
    blueprint?.emotion?.trim() ||
    blueprint?.voiceEmotion?.trim() ||
    inferEmotionFromText(narrative)
  const pacing = PACING_BY_ROLE[role] ?? 'measured'
  const tension = TENSION_BY_ROLE[role] ?? 0.55
  const emphasisWords =
    blueprint?.voiceEmphasisWords?.length
      ? blueprint.voiceEmphasisWords
      : extractEmphasisWords(narrative)
  const pausePoints =
    blueprint?.voicePausePoints?.length
      ? blueprint.voicePausePoints
      : pauseBeforeWords(narrative, emphasisWords)
  const prof = profile ?? voiceProfileById('documentary_narrator')
  const narrationSpeed =
    blueprint?.voiceNarrationSpeed ??
    narrationSpeedForScene(prof, pacing, tension)

  return {
    sceneId: scene.id,
    emotion,
    pacing,
    tension,
    mood: emotion,
    pausePoints,
    emphasisWords,
    narrationSpeed,
    directionNote: directionNoteForScene(emotion, pacing, emphasisWords, pausePoints),
  }
}

function inferEmotionFromText(text: string): string {
  const blob = text.toLowerCase()
  if (/\b(suspense|secret|mistake|nobody|noticed|hidden)\b/.test(blob)) return 'suspense'
  if (/\b(luxury|marble|gold|premium|elegant)\b/.test(blob)) return 'luxury'
  if (/\b(calm|reflect|quiet|soft|gentle)\b/.test(blob)) return 'reflective'
  if (/\b(power|drive|relentless|discipline|rise)\b/.test(blob)) return 'powerful'
  if (/\b(fear|dread|anxious|tension)\b/.test(blob)) return 'tension'
  return 'cinematic'
}

export function buildSceneVoiceDirections(
  scenes: GeneratedScene[],
  options: {
    sceneBlueprints?: SceneBlueprint[]
    profile?: VoiceProfile
  } = {}
): SceneVoiceDirection[] {
  const total = scenes.length || 1
  const map = new Map(
    (options.sceneBlueprints ?? []).map((b) => [b.sceneId, b])
  )
  const profile = options.profile ?? voiceProfileById('documentary_narrator')
  return scenes.map((scene, index) =>
    buildSceneVoiceDirection(scene, index, total, map.get(scene.id), profile)
  )
}

/** Merge voice direction fields into scene blueprints for OUTPUT_ALIGNMENT persistence. */
export function applyVoiceDirectionToBlueprints(
  blueprints: SceneBlueprint[],
  directions: SceneVoiceDirection[]
): SceneBlueprint[] {
  const dirMap = new Map(directions.map((d) => [d.sceneId, d]))
  return blueprints.map((bp) => {
    const dir = dirMap.get(bp.sceneId)
    if (!dir) return bp
    return {
      ...bp,
      voiceEmotion: dir.emotion,
      voicePausePoints: dir.pausePoints,
      voiceEmphasisWords: dir.emphasisWords,
      voiceNarrationSpeed: dir.narrationSpeed,
    }
  })
}

export function buildVoiceDirectorPlan(input: VoiceDirectorInput): VoiceDirectorPlan {
  const profile = input.voiceProfileId
    ? voiceProfileById(input.voiceProfileId)
    : selectVoiceProfile({
        niche: input.niche,
        tone: input.tone,
        contentBrief: input.contentBrief,
        parsedIntent: input.parsedIntent,
        audienceType: input.audienceType,
      })

  const sceneDirections = buildSceneVoiceDirections(input.scenes, {
    sceneBlueprints: input.sceneBlueprints,
    profile,
  })

  const voiceId =
    input.elevenLabsVoiceId?.trim() || profile.defaultVoiceId

  const emphasis = sceneDirections
    .flatMap((d) => d.emphasisWords)
    .slice(0, 8)
  const pauses = sceneDirections.flatMap((d) => d.pausePoints).slice(0, 6)

  const avgSpeed =
    sceneDirections.length > 0
      ? sceneDirections.reduce((s, d) => s + d.narrationSpeed, 0) /
        sceneDirections.length
      : profile.speed

  return {
    profile,
    voiceId,
    speakingStyle: profile.speakingStyle,
    speed: Math.round(avgSpeed * 100) / 100,
    emphasis,
    pauses,
    sceneDirections,
  }
}

/** Insert natural pauses for TTS (ellipsis before emphasis / pivot words). */
export function applyVoicePausesToScript(
  script: string,
  directions: SceneVoiceDirection[]
): string {
  let text = script.trim()
  if (!text || directions.length === 0) return text

  const pauseWords = [
    ...new Set(directions.flatMap((d) => d.pausePoints).filter(Boolean)),
  ].slice(0, 6)

  for (const word of pauseWords) {
    const re = new RegExp(`(\\s)(${word}\\b)`, 'gi')
    text = text.replace(re, '$1… $2')
  }
  return text.replace(/\s+/g, ' ').trim()
}
