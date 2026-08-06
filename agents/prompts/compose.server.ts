import 'server-only'

import type {
  CharacterProfile,
  CinematicStyle,
  LocationProfile,
  ProductionPlan,
  PromptMetadata,
  ResearchBrief,
  ScenePrompt,
  ScriptScene,
  StoryboardScene,
  StoryboardShot,
  V3CharacterRow,
  V3LocationRow,
  V3SceneRow,
} from '@/types/v3/production'

export type PromptEngineSceneContext = {
  scene: V3SceneRow
  script: ScriptScene
  storyboard: StoryboardScene
  primaryShot: StoryboardShot
  characters: CharacterProfile[]
  location: LocationProfile | null
}

export type PromptEngineInput = {
  plan: ProductionPlan
  style: CinematicStyle
  research: ResearchBrief
  scenes: PromptEngineSceneContext[]
}

const STANDARD_NEGATIVE =
  'blurry, low quality, distorted anatomy, extra limbs, watermark, text overlay, logo, duplicate subject, inconsistent lighting, shaky camera, compression artifacts, cartoon, illustration'

function stableJoin(parts: string[]): string {
  return parts.map((p) => p.trim()).filter(Boolean).join('. ')
}

function buildSubject(script: ScriptScene, characters: CharacterProfile[]): string {
  if (characters.length > 0) {
    return characters.map((c) => `${c.name} (${c.role})`).join(', ')
  }
  if (script.title.trim()) return script.title
  return script.narration.slice(0, 160)
}

function buildCharacterBlock(characters: CharacterProfile[]): { text: string; seed: string; appearance: string } {
  if (characters.length === 0) {
    return {
      text: 'No on-screen characters; environment and product focus',
      seed: 'none',
      appearance: 'N/A — no character in frame',
    }
  }

  const appearance = characters
    .map(
      (c) =>
        `${c.name}: ${c.appearance}. Clothing: ${c.clothing}. Hair: ${c.hairstyle}. Face: ${c.facialFeatures}.`
    )
    .join(' ')

  const seed = characters.map((c) => c.seed).join(',')

  return {
    text: appearance,
    seed,
    appearance,
  }
}

function buildConsistencyReferences(
  plan: ProductionPlan,
  style: CinematicStyle,
  characters: CharacterProfile[],
  location: LocationProfile | null
): string[] {
  const refs: string[] = [
    `film-stock:${style.filmStock}`,
    `grade:${style.colorGrading}`,
    `aspect:${plan.aspectRatio}`,
  ]
  if (location) refs.push(`location:${location.locationId}`)
  for (const c of characters) {
    refs.push(`character:${c.characterId}:seed:${c.seed}`)
  }
  return refs.sort()
}

/** Deterministic prompt composition — same inputs always produce identical prompts. */
export function composeScenePrompt(
  input: PromptEngineInput,
  ctx: PromptEngineSceneContext
): ScenePrompt {
  const { plan, style, research } = input
  const { scene, script, storyboard, primaryShot, characters, location } = ctx

  if (!location) {
    throw new Error(`Scene ${scene.number}: location memory missing`)
  }

  const characterBlock = buildCharacterBlock(characters)
  const subject = buildSubject(script, characters)
  const mood = script.emotion || research.emotionalDirection[0] || plan.music
  const movement = primaryShot.movement || style.motionStyle
  const lens = primaryShot.lens || style.lens
  const lighting = primaryShot.lighting || location.lighting || style.lightingStyle
  const consistencyReferences = buildConsistencyReferences(plan, style, characters, location)

  const metadata: PromptMetadata = {
    camera: style.cameraSystem,
    lens,
    lighting,
    movement,
    quality: 'Ultra Realistic',
    style: style.filmStock,
    aspectRatio: plan.aspectRatio,
    characterSeed: characterBlock.seed,
    characterAppearance: characterBlock.appearance,
    location: location.name,
    consistencyReferences,
  }

  const imageSections = [
    `Subject: ${subject}`,
    `Environment: ${location.environment}. Weather: ${location.weather}. Architecture: ${location.architecture}.`,
    `Character: ${characterBlock.text}`,
    `Seed: ${characterBlock.seed}`,
    `Location: ${location.name} — ${location.mood}`,
    `Camera: ${style.cameraSystem}, ${primaryShot.cameraAngle}, ${primaryShot.framing}`,
    `Lens: ${lens}`,
    `Lighting: ${lighting}. ${style.lightingStyle}`,
    `Composition: ${style.composition}. ${primaryShot.framing}`,
    `Movement: static master frame reference for ${movement}`,
    `Mood: ${mood}. ${research.emotionalDirection.slice(0, 2).join(', ')}`,
    `Film Stock: ${style.filmStock}. Color grade: ${style.colorGrading}`,
    `Rendering Quality: Ultra photorealistic cinematic still, 8K detail, natural skin texture, accurate physics`,
    `Aspect Ratio: ${plan.aspectRatio}`,
    `Style: ${plan.style}. ${style.filmStock}`,
    `Consistency References: ${consistencyReferences.join(' | ')}`,
  ]

  const videoSections = [
    ...imageSections.slice(0, -1),
    `Movement: ${movement}. ${style.motionStyle}`,
    `Rendering Quality: Ultra photorealistic cinematic video, smooth motion, no flicker`,
    `Aspect Ratio: ${plan.aspectRatio}`,
    `Style: ${plan.style}. ${style.filmStock}`,
    `Consistency References: ${consistencyReferences.join(' | ')}`,
  ]

  return {
    sceneId: scene.id,
    sceneNumber: scene.number,
    imagePrompt: stableJoin(imageSections),
    videoPrompt: stableJoin(videoSections),
    negativePrompt: STANDARD_NEGATIVE,
    metadata,
  }
}

export function composeAllScenePrompts(input: PromptEngineInput): ScenePrompt[] {
  return input.scenes
    .slice()
    .sort((a, b) => a.scene.number - b.scene.number)
    .map((ctx) => composeScenePrompt(input, ctx))
}

export function resolveSceneContexts(params: {
  scenes: V3SceneRow[]
  characters: V3CharacterRow[]
  locations: V3LocationRow[]
}): PromptEngineSceneContext[] {
  const characterById = new Map(
    params.characters.map((row) => [row.id, row.appearance_json as CharacterProfile])
  )
  const locationById = new Map(
    params.locations.map((row) => [row.id, row.profile as LocationProfile])
  )

  return params.scenes.map((scene) => {
    const script = scene.script as ScriptScene
    const storyboard = scene.storyboard as StoryboardScene
    if (!storyboard?.shots?.length) {
      throw new Error(`Scene ${scene.number}: storyboard shots missing`)
    }

    const sceneCharacters = scene.character_ids
      .map((id) => characterById.get(id))
      .filter((c): c is CharacterProfile => Boolean(c))

    const location = scene.location_id ? locationById.get(scene.location_id) ?? null : null

    return {
      scene,
      script,
      storyboard,
      primaryShot: storyboard.shots[0],
      characters: sceneCharacters,
      location,
    }
  })
}

export function buildSceneCharacterRequirements(
  contexts: PromptEngineSceneContext[]
): Map<number, boolean> {
  return new Map(
    contexts.map((ctx) => [ctx.scene.number, ctx.characters.length > 0])
  )
}
