import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_PROFILES } from '@/lib/cinematic/niches'
import { NICHE_VISUAL } from '@/lib/cinematic/visual-direction'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'

export type StoryBibleCharacterProfile = {
  name?: string
  age?: string
  appearance?: string
  clothing?: string
  traits?: string[]
}

export type StoryBibleLocks = {
  character?: boolean
  environment?: boolean
  palette?: boolean
}

export type StoryBible = {
  characterProfile: StoryBibleCharacterProfile
  visualStyle: string
  colorPalette: string
  environment: string
  cameraLanguage: string
  mood: string
  locks?: StoryBibleLocks
}

export const EMPTY_STORY_BIBLE: StoryBible = {
  characterProfile: {},
  visualStyle: '',
  colorPalette: '',
  environment: '',
  cameraLanguage: '',
  mood: '',
  locks: {},
}

function clip(value: string, max: number): string {
  const t = value.trim()
  if (!t) return ''
  return t.length > max ? t.slice(0, max) : t
}

function firstNonEmpty(scenes: GeneratedScene[], key: keyof GeneratedScene): string {
  for (const scene of scenes) {
    const raw = scene[key]
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
  }
  return ''
}

export function parseStoryBible(raw: unknown): StoryBible | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const profileRaw =
    row.characterProfile && typeof row.characterProfile === 'object'
      ? (row.characterProfile as Record<string, unknown>)
      : {}

  const traits = Array.isArray(profileRaw.traits)
    ? profileRaw.traits
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => clip(t, 48))
        .slice(0, 8)
    : undefined

  const locksRaw =
    row.locks && typeof row.locks === 'object'
      ? (row.locks as Record<string, unknown>)
      : {}

  const bible: StoryBible = {
    characterProfile: {
      name: clip(String(profileRaw.name ?? ''), 80) || undefined,
      age: clip(String(profileRaw.age ?? ''), 40) || undefined,
      appearance: clip(String(profileRaw.appearance ?? ''), 320) || undefined,
      clothing: clip(String(profileRaw.clothing ?? ''), 160) || undefined,
      traits: traits?.length ? traits : undefined,
    },
    visualStyle: clip(String(row.visualStyle ?? ''), 240),
    colorPalette: clip(String(row.colorPalette ?? ''), 160),
    environment: clip(String(row.environment ?? ''), 200),
    cameraLanguage: clip(String(row.cameraLanguage ?? ''), 160),
    mood: clip(String(row.mood ?? ''), 120),
    locks: {
      character: locksRaw.character === true,
      environment: locksRaw.environment === true,
      palette: locksRaw.palette === true,
    },
  }

  const hasContent =
    bible.visualStyle ||
    bible.colorPalette ||
    bible.environment ||
    bible.cameraLanguage ||
    bible.mood ||
    bible.characterProfile.appearance ||
    bible.characterProfile.name

  return hasContent ? bible : null
}

export function extractStoryBibleFromScript(script: string): StoryBibleCharacterProfile {
  const profile: StoryBibleCharacterProfile = {}
  if (!script?.trim()) return profile

  const nameMatch = script.match(
    /(?:protagonist|main character|subject|character)(?:\s+name)?[:\s]+([^\n,.]{2,60})/i
  )
  if (nameMatch?.[1]) profile.name = clip(nameMatch[1], 80)

  const ageMatch = script.match(/\bage[:\s]+(\d{1,3}|\w+\s+years?\s+old)/i)
  if (ageMatch?.[1]) profile.age = clip(ageMatch[1], 40)

  const appearanceMatch = script.match(
    /(?:appearance|looks like|visual)[:\s]+([^\n]+)/i
  )
  if (appearanceMatch?.[1]) profile.appearance = clip(appearanceMatch[1], 320)

  const clothingMatch = script.match(/(?:wearing|clothing|outfit)[:\s]+([^\n]+)/i)
  if (clothingMatch?.[1]) profile.clothing = clip(clothingMatch[1], 160)

  const traitMatches = script.matchAll(
    /(?:trait|personality)[:\s]+([^\n]+)/gi
  )
  const traits: string[] = []
  for (const m of traitMatches) {
    if (m[1]) traits.push(clip(m[1], 48))
    if (traits.length >= 6) break
  }
  if (traits.length) profile.traits = traits

  return profile
}

function formatCharacterForPrompt(
  profile: StoryBibleCharacterProfile,
  fallbackDescription?: string
): string {
  const parts: string[] = []
  if (profile.name) parts.push(`Name: ${profile.name}`)
  if (profile.age) parts.push(`Age: ${profile.age}`)
  if (profile.appearance) parts.push(`Appearance: ${profile.appearance}`)
  else if (fallbackDescription?.trim()) {
    parts.push(`Appearance: ${clip(fallbackDescription, 220)}`)
  }
  if (profile.clothing) parts.push(`Clothing: ${profile.clothing}`)
  if (profile.traits?.length) {
    parts.push(`Traits: ${profile.traits.join(', ')}`)
  }
  return parts.join('. ')
}

export function buildStoryBibleFromVisualDirection(input: {
  scenes: GeneratedScene[]
  niche: CinematicNiche
  style: string
  visualStyle?: VisualStyle | null
  characterDescription?: string
  script?: string
  emotionalGoal?: string
  moodKeywords?: string[]
  existing?: StoryBible | null
}): StoryBible {
  const { scenes, niche, style, visualStyle, existing } = input
  const profile = NICHE_PROFILES[niche]
  const nicheVisual = NICHE_VISUAL[niche]

  const anchor = scenes[0]
  const fromScript = extractStoryBibleFromScript(input.script ?? '')
  const charDesc = input.characterDescription?.trim() ?? ''

  const characterProfile: StoryBibleCharacterProfile = {
    ...fromScript,
    appearance:
      fromScript.appearance ||
      existing?.characterProfile.appearance ||
      charDesc ||
      undefined,
    name: fromScript.name || existing?.characterProfile.name,
    age: fromScript.age || existing?.characterProfile.age,
    clothing: fromScript.clothing || existing?.characterProfile.clothing,
    traits: fromScript.traits?.length
      ? fromScript.traits
      : existing?.characterProfile.traits,
  }

  const colorPalette =
    firstNonEmpty(scenes, 'colorPalette') ||
    visualStyle?.palette ||
    nicheVisual.palette

  const environment =
    firstNonEmpty(scenes, 'environment') ||
    visualStyle?.environment ||
    nicheVisual.environment

  const cameraLanguage =
    firstNonEmpty(scenes, 'cameraAngle') ||
    visualStyle?.camera ||
    nicheVisual.camera

  const visualStyleLine = [
    visualStyle?.label,
    profile.label,
    nicheVisual.language,
    style,
  ]
    .filter(Boolean)
    .join(' — ')

  const moodParts = [
    input.emotionalGoal?.replace(/_/g, ' '),
    input.moodKeywords?.length ? input.moodKeywords.join(', ') : '',
    anchor?.lightingMood,
    existing?.mood,
  ].filter(Boolean)

  const bible: StoryBible = {
    characterProfile,
    visualStyle: clip(visualStyleLine, 240),
    colorPalette: clip(colorPalette, 160),
    environment: clip(environment, 200),
    cameraLanguage: clip(cameraLanguage, 160),
    mood: clip(moodParts[0] ?? nicheVisual.lighting, 120),
    locks: existing?.locks ?? {},
  }

  logStoryBible('built', {
    niche,
    sceneCount: scenes.length,
    locked: bible.locks,
  })

  return bible
}

export function logStoryBible(
  event: 'built' | 'applied' | 'persisted',
  detail: Record<string, unknown>
): void {
  console.info('[STORY_BIBLE]', event, detail)
}

export function formatStoryBibleForPrompt(bible: StoryBible): string {
  const character = formatCharacterForPrompt(bible.characterProfile)
  const lines = [
    'CINEMATIC CONTINUITY (Story Bible):',
    character ? `CHARACTER: ${character}` : null,
    bible.visualStyle ? `VISUAL STYLE: ${bible.visualStyle}` : null,
    bible.colorPalette ? `COLOR PALETTE: ${bible.colorPalette}` : null,
    bible.environment ? `ENVIRONMENT: ${bible.environment}` : null,
    bible.cameraLanguage ? `CAMERA: ${bible.cameraLanguage}` : null,
    bible.mood ? `MOOD: ${bible.mood}` : null,
  ].filter(Boolean)
  return lines.join('\n')
}

export type ContinuityPromptScene = Pick<
  GeneratedScene,
  | 'title'
  | 'description'
  | 'visualPrompt'
  | 'imagePrompt'
  | 'cameraAngle'
  | 'lightingMood'
  | 'environment'
  | 'colorPalette'
  | 'movementStyle'
>

function previousSceneSummary(scene: ContinuityPromptScene | null | undefined): string {
  if (!scene) return 'None — opening frame.'
  const beat =
    scene.imagePrompt ||
    scene.visualPrompt ||
    scene.description ||
    scene.title ||
    ''
  const env = scene.environment ? ` Setting: ${scene.environment}.` : ''
  const palette = scene.colorPalette ? ` Palette: ${scene.colorPalette}.` : ''
  return clip(`${beat}${env}${palette}`, 280) || 'Prior beat established.'
}

function resolveLockedField(
  locked: boolean | undefined,
  bibleValue: string,
  sceneValue: string
): string {
  if (locked && bibleValue.trim()) return bibleValue.trim()
  return sceneValue.trim() || bibleValue.trim()
}

export function buildContinuityStoryboardPrompt(params: {
  bible: StoryBible
  scene: ContinuityPromptScene
  sceneIndex: number
  totalScenes: number
  previousScene?: ContinuityPromptScene | null
  variantFraming?: string
  role?: string
}): string {
  const { bible, scene, sceneIndex, totalScenes, previousScene } = params
  const locks = bible.locks ?? {}

  const palette = resolveLockedField(
    locks.palette,
    bible.colorPalette,
    scene.colorPalette ?? ''
  )
  const environment = resolveLockedField(
    locks.environment,
    bible.environment,
    scene.environment ?? ''
  )
  const characterLine = locks.character
    ? formatCharacterForPrompt(bible.characterProfile)
    : formatCharacterForPrompt(bible.characterProfile, scene.description)

  const currentBeat =
    scene.imagePrompt ||
    scene.visualPrompt ||
    scene.description ||
    scene.title ||
    `Scene ${sceneIndex}`

  const bibleBlock = [
    'CINEMATIC CONTINUITY (Story Bible):',
    characterLine ? `CHARACTER: ${characterLine}` : null,
    bible.visualStyle ? `VISUAL STYLE: ${bible.visualStyle}` : null,
    palette ? `COLOR PALETTE: ${palette}` : null,
    environment ? `ENVIRONMENT: ${environment}` : null,
    bible.cameraLanguage ? `CAMERA: ${bible.cameraLanguage}` : null,
    bible.mood ? `MOOD: ${bible.mood}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const lines = [
    'Cinematic director storyboard frame for a vertical creator reel.',
    params.variantFraming ?? 'Primary storyboard frame.',
    params.role ? `Scene ${sceneIndex} — ${params.role}.` : `Scene ${sceneIndex} of ${totalScenes}.`,
    '',
    bibleBlock,
    '',
    `PREVIOUS SCENE: ${previousSceneSummary(previousScene)}`,
    `CURRENT SCENE: ${clip(currentBeat, 360)}`,
    scene.cameraAngle && !locks.character
      ? `Scene camera note: ${scene.cameraAngle}.`
      : null,
    scene.lightingMood ? `Lighting: ${scene.lightingMood}.` : null,
    scene.movementStyle ? `Movement: ${scene.movementStyle}.` : null,
    '',
    'RULES:',
    '- Same character identity, wardrobe, and silhouette across all scenes.',
    '- Maintain color palette and environment world unless script demands a motivated shift.',
    '- Camera language should progress naturally from the previous scene.',
    '- Single composed 9:16 frame. No text overlays, watermarks, or collage.',
    '- Storyboard illustration — emotionally directed, restrained, not generic AI art.',
  ]

  const prompt = lines.filter(Boolean).join('\n')
  logStoryBible('applied', { sceneIndex, totalScenes, locks })
  return prompt.replace(/\s+/g, ' ').trim()
}

export function mergeStoryBible(
  base: StoryBible | null,
  patch: Partial<StoryBible>
): StoryBible {
  const current = base ?? { ...EMPTY_STORY_BIBLE }
  return {
    ...current,
    ...patch,
    characterProfile: {
      ...current.characterProfile,
      ...patch.characterProfile,
    },
    locks: {
      ...current.locks,
      ...patch.locks,
    },
  }
}
