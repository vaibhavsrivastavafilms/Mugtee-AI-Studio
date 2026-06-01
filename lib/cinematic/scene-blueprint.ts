import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import type { MotionPresetId } from '@/lib/motion/motion-presets'
import { scenePacingRole } from '@/lib/cinematic/regen-context'

/** Single source of truth: scene → visual blueprint → image → animation */
export type SceneBlueprint = {
  sceneId: string
  narrativeGoal: string
  emotion: string
  location: string
  subject: string
  action: string
  cameraAngle: string
  lighting: string
  colorPalette: string
  movementStyle: string
  /** Voice Director Pass — optional per-scene narration direction */
  voiceEmotion?: string
  voicePausePoints?: string[]
  voiceEmphasisWords?: string[]
  voiceNarrationSpeed?: number
}

export type VisualConsistencyPack = {
  characterReference: string
  environmentReference: string
  visualStyleReference: string
}

/** Creator tuning without full project regen */
export type OutputAlignmentControls = {
  visualStyle?: string
  characterConsistency?: 'strict' | 'balanced' | 'loose'
  animationStyle?: 'cinematic' | 'documentary' | 'dynamic' | 'subtle'
  cameraLanguage?: string
}

export const DEFAULT_OUTPUT_ALIGNMENT_CONTROLS: OutputAlignmentControls = {
  characterConsistency: 'balanced',
  animationStyle: 'cinematic',
}

export const ALIGNMENT_PASS_THRESHOLD = 80

const EMOTION_WORDS =
  /\b(suspense|tension|mystery|dread|anxious|fear|documentary|observ|luxury|premium|opulent|emotional|grief|tear|intimate|action|chase|battle|conflict|hope|triumph|calm|serene)\b/i

function firstSentence(text: string, max = 200): string {
  const t = text.trim()
  if (!t) return ''
  const s = t.split(/[.!?]/)[0]?.trim() ?? t
  return s.slice(0, max)
}

function extractSubject(description: string, characterDescription?: string): string {
  if (characterDescription?.trim()) {
    const c = characterDescription.trim().slice(0, 200)
    if (c.length >= 12) return c
  }
  const who =
    description.match(
      /\b(a|the)\s+([\w\s-]{3,40}?)\s+(walks|stands|sits|runs|looks|enters|leaves|holds|wears)/i
    )?.[2] ??
    description.match(
      /\b(woman|man|figure|person|protagonist|narrator|billionaire|ceo|child|elder|couple)\b[^.]{0,60}/i
    )?.[0]
  return who?.trim().slice(0, 120) || 'Primary subject in frame'
}

function extractAction(description: string): string {
  const verb =
    description.match(
      /\b(walks|runs|stands|sits|enters|leaves|looks|gazes|opens|closes|holds|reaches|turns|discovers|reveals)\b[^.]{0,80}/i
    )?.[0] ?? description.slice(0, 100)
  return verb.trim().slice(0, 140) || 'Motivated action in scene'
}

function extractLocation(description: string, environment?: string): string {
  if (environment?.trim()) return environment.trim().slice(0, 120)
  const loc =
    description.match(
      /\b(in|inside|through|at)\s+(?:a|the)?\s*([\w\s-]{4,50}?)(?:\.|,|$)/i
    )?.[2] ??
    description.match(
      /\b(mansion|hallway|street|office|forest|beach|city|room|kitchen|studio|marble|apartment|rooftop)\b[^.]{0,40}/i
    )?.[0]
  return loc?.trim().slice(0, 120) || 'Contextual setting'
}

function inferEmotion(
  description: string,
  lightingMood?: string,
  narrativeGoal?: string
): string {
  const blob = `${description} ${lightingMood ?? ''} ${narrativeGoal ?? ''}`.toLowerCase()
  if (/\b(suspense|tension|mystery|dread|anxious|fear|secret)\b/.test(blob)) return 'suspense'
  if (/\b(luxury|premium|opulent|gold|marble|haute|wealth)\b/.test(blob)) return 'luxury'
  if (/\b(documentary|observ|report|archive|testimony)\b/.test(blob)) return 'documentary'
  if (/\b(tear|grief|intimate|emotion|heart|loss|love|confess)\b/.test(blob)) return 'emotional'
  if (/\b(chase|battle|fight|run|crash|explosion|action)\b/.test(blob)) return 'action'
  if (EMOTION_WORDS.test(blob)) {
    const m = blob.match(EMOTION_WORDS)
    if (m?.[0]) return m[0].toLowerCase()
  }
  return 'cinematic'
}

function narrativeGoalForIndex(index: number, total: number, title: string): string {
  const role = scenePacingRole(index + 1, total)
  const label = title.trim() || `Beat ${index + 1}`
  const goals: Record<string, string> = {
    hook: `Hook attention — ${label}`,
    tension: `Build tension — ${label}`,
    peak: `Emotional peak — ${label}`,
    aftertaste: `Resolve and linger — ${label}`,
    bridge: `Bridge story beat — ${label}`,
  }
  return goals[role] ?? `Advance narrative — ${label}`
}

/** Build blueprint from scene + script beat (never from generic placeholders alone). */
export function buildSceneBlueprintFromScene(
  scene: GeneratedScene,
  options: {
    index: number
    total: number
    script?: string
    characterDescription?: string
    visualStyle?: VisualStyle | null
    storyBible?: StoryBible | null
    controls?: OutputAlignmentControls | null
  }
): SceneBlueprint {
  const narrative = (scene.description || scene.visualPrompt || scene.title || '').trim()
  const emotion = inferEmotion(narrative, scene.lightingMood, scene.title)
  const subject = extractSubject(narrative, options.characterDescription)
  const action = extractAction(narrative)
  const location = extractLocation(narrative, scene.environment)

  const camera =
    options.controls?.cameraLanguage?.trim() ||
    scene.cameraAngle?.trim() ||
    options.storyBible?.cameraLanguage?.trim() ||
    options.visualStyle?.camera?.trim() ||
    'Motivated medium framing'

  const lighting =
    scene.lightingMood?.trim() ||
    options.visualStyle?.lighting?.trim() ||
    options.storyBible?.mood?.trim() ||
    'Motivated cinematic key light'

  const palette =
    scene.colorPalette?.trim() ||
    options.visualStyle?.palette?.trim() ||
    options.storyBible?.colorPalette?.trim() ||
    'Cohesive project palette'

  const movement =
    scene.movementStyle?.trim() ||
    options.visualStyle?.movement?.trim() ||
    movementStyleForEmotion(emotion, options.controls?.animationStyle)

  return {
    sceneId: scene.id,
    narrativeGoal: narrativeGoalForIndex(options.index, options.total, scene.title),
    emotion,
    location,
    subject,
    action,
    cameraAngle: camera,
    lighting,
    colorPalette: palette,
    movementStyle: movement,
  }
}

export function buildBlueprintsForScenes(
  scenes: GeneratedScene[],
  options: {
    script?: string
    characterDescription?: string
    visualStyle?: VisualStyle | null
    storyBible?: StoryBible | null
    controls?: OutputAlignmentControls | null
  } = {}
): SceneBlueprint[] {
  const total = scenes.length || 1
  return scenes.map((scene, index) =>
    buildSceneBlueprintFromScene(scene, { ...options, index, total })
  )
}

export function blueprintBySceneId(
  blueprints: SceneBlueprint[]
): Map<string, SceneBlueprint> {
  return new Map(blueprints.map((b) => [b.sceneId, b]))
}

/** Sync generated scene visual fields from blueprint (downstream consumers read same truth). */
export function applyBlueprintToScene(
  scene: GeneratedScene,
  blueprint: SceneBlueprint
): GeneratedScene {
  const beatLine = (scene.description || scene.visualPrompt || '').trim()
  const existingPrompt = scene.imagePrompt?.trim()
  const blueprintPrompt = buildBlueprintImagePrompt(blueprint, null)
  const imagePrompt =
    existingPrompt && beatLine && existingPrompt.includes(beatLine.slice(0, 40))
      ? existingPrompt
      : beatLine
        ? `${beatLine.slice(0, 200)} — ${blueprintPrompt}`.slice(0, 900)
        : blueprintPrompt
  return {
    ...scene,
    cameraAngle: blueprint.cameraAngle,
    lightingMood: blueprint.lighting,
    environment: blueprint.location,
    colorPalette: blueprint.colorPalette,
    movementStyle: blueprint.movementStyle,
    visualPrompt: beatLine || buildBlueprintVisualPrompt(blueprint),
    imagePrompt,
  }
}

export function applyBlueprintsToScenes(
  scenes: GeneratedScene[],
  blueprints: SceneBlueprint[]
): GeneratedScene[] {
  const map = blueprintBySceneId(blueprints)
  return scenes.map((scene) => {
    const bp = map.get(scene.id)
    return bp ? applyBlueprintToScene(scene, bp) : scene
  })
}

export function buildVisualConsistencyPack(
  blueprints: SceneBlueprint[],
  options: {
    characterDescription?: string
    visualStyle?: VisualStyle | null
    storyBible?: StoryBible | null
    controls?: OutputAlignmentControls | null
  }
): VisualConsistencyPack {
  const anchor = blueprints[0]
  const strict = options.controls?.characterConsistency === 'strict'
  const subject =
    options.characterDescription?.trim() ||
    anchor?.subject ||
    'Consistent protagonist across scenes'
  const environment =
    options.storyBible?.environment?.trim() ||
    anchor?.location ||
    options.visualStyle?.environment?.trim() ||
    'Consistent environment thread'
  const styleBits = [
    options.controls?.visualStyle?.trim(),
    options.visualStyle?.label,
    options.visualStyle?.palette && `Palette: ${options.visualStyle.palette}`,
    options.visualStyle?.lighting && `Lighting: ${options.visualStyle.lighting}`,
    options.storyBible?.visualStyle,
    anchor?.colorPalette && `Palette lock: ${anchor.colorPalette}`,
  ].filter(Boolean)
  const visualStyleReference = styleBits.join(' · ') || 'Cinematic vertical storyboard'

  return {
    characterReference: strict
      ? `LOCKED character — ${subject}. Same face, wardrobe, and silhouette every scene.`
      : `Character consistency: ${subject}.`,
    environmentReference: `Environment thread: ${environment}.`,
    visualStyleReference: `Visual identity: ${visualStyleReference}.`,
  }
}

/** WHO / WHERE / WHAT / MOOD image body from blueprint (not raw script paragraph). */
export function buildBlueprintVisualPrompt(blueprint: SceneBlueprint): string {
  return [
    `WHO: ${blueprint.subject}.`,
    `WHERE: ${blueprint.location}.`,
    `WHAT: ${blueprint.action}.`,
    `MOOD: ${blueprint.emotion} — ${blueprint.narrativeGoal}.`,
  ].join(' ')
}

export function buildBlueprintImagePrompt(
  blueprint: SceneBlueprint,
  consistency: VisualConsistencyPack | null
): string {
  const parts = [
    buildBlueprintVisualPrompt(blueprint),
    `Camera: ${blueprint.cameraAngle}.`,
    `Lighting: ${blueprint.lighting}.`,
    `Palette: ${blueprint.colorPalette}.`,
    `Movement intent: ${blueprint.movementStyle}.`,
  ]
  if (consistency) {
    parts.push(
      consistency.characterReference,
      consistency.environmentReference,
      consistency.visualStyleReference
    )
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 900)
}

function movementStyleForEmotion(
  emotion: string,
  animationStyle?: OutputAlignmentControls['animationStyle']
): string {
  if (animationStyle === 'documentary') return 'Observational handheld drift'
  if (animationStyle === 'dynamic') return 'Energetic tracking movement'
  if (animationStyle === 'subtle') return 'Slow minimal drift'
  switch (emotion) {
    case 'suspense':
      return 'Slow push-in, tightening frame'
    case 'documentary':
      return 'Handheld observational drift'
    case 'luxury':
      return 'Elegant cinematic pan'
    case 'emotional':
      return 'Slow zoom toward subject'
    case 'action':
      return 'Tracking movement with energy'
    default:
      return 'Cinematic motivated movement'
  }
}

/** Animation preset from blueprint emotion / movement (Phase 4). */
export function motionPresetIdFromBlueprint(
  blueprint: SceneBlueprint,
  controls?: OutputAlignmentControls | null
): MotionPresetId {
  if (controls?.animationStyle === 'documentary') return 'documentary_drift'
  if (controls?.animationStyle === 'subtle') return 'subtle_zoom'
  if (controls?.animationStyle === 'dynamic') return 'battle_tracking'

  const blob = `${blueprint.emotion} ${blueprint.movementStyle} ${blueprint.narrativeGoal}`.toLowerCase()
  if (/\b(suspense|tension|mystery|dread)\b/.test(blob)) return 'push_in'
  if (/\b(documentary|observ|handheld)\b/.test(blob)) return 'documentary_drift'
  if (/\b(luxury|premium|elegant|pan)\b/.test(blob)) return 'luxury_reveal'
  if (/\b(emotional|grief|tear|intimate|zoom)\b/.test(blob)) return 'emotional_close_up'
  if (/\b(action|chase|tracking|battle|run)\b/.test(blob)) return 'battle_tracking'
  return 'historical_push_in'
}

export function parseSceneBlueprints(raw: unknown): SceneBlueprint[] {
  if (!Array.isArray(raw)) return []
  const out: SceneBlueprint[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const sceneId = typeof row.sceneId === 'string' ? row.sceneId.trim() : ''
    if (!sceneId) continue
    const voicePausePoints = Array.isArray(row.voicePausePoints)
      ? row.voicePausePoints.filter((v): v is string => typeof v === 'string')
      : undefined
    const voiceEmphasisWords = Array.isArray(row.voiceEmphasisWords)
      ? row.voiceEmphasisWords.filter((v): v is string => typeof v === 'string')
      : undefined
    out.push({
      sceneId,
      narrativeGoal: String(row.narrativeGoal ?? '').trim(),
      emotion: String(row.emotion ?? '').trim(),
      location: String(row.location ?? '').trim(),
      subject: String(row.subject ?? '').trim(),
      action: String(row.action ?? '').trim(),
      cameraAngle: String(row.cameraAngle ?? '').trim(),
      lighting: String(row.lighting ?? '').trim(),
      colorPalette: String(row.colorPalette ?? '').trim(),
      movementStyle: String(row.movementStyle ?? '').trim(),
      voiceEmotion:
        typeof row.voiceEmotion === 'string' ? row.voiceEmotion.trim() : undefined,
      voicePausePoints: voicePausePoints?.length ? voicePausePoints : undefined,
      voiceEmphasisWords: voiceEmphasisWords?.length ? voiceEmphasisWords : undefined,
      voiceNarrationSpeed:
        typeof row.voiceNarrationSpeed === 'number' && Number.isFinite(row.voiceNarrationSpeed)
          ? row.voiceNarrationSpeed
          : undefined,
    })
  }
  return out
}

export function parseOutputAlignmentControls(
  raw: unknown
): OutputAlignmentControls {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_OUTPUT_ALIGNMENT_CONTROLS }
  }
  const row = raw as Record<string, unknown>
  const cc = row.characterConsistency
  const anim = row.animationStyle
  return {
    visualStyle: typeof row.visualStyle === 'string' ? row.visualStyle.trim() : undefined,
    cameraLanguage:
      typeof row.cameraLanguage === 'string' ? row.cameraLanguage.trim() : undefined,
    characterConsistency:
      cc === 'strict' || cc === 'balanced' || cc === 'loose' ? cc : 'balanced',
    animationStyle:
      anim === 'cinematic' ||
      anim === 'documentary' ||
      anim === 'dynamic' ||
      anim === 'subtle'
        ? anim
        : 'cinematic',
  }
}
