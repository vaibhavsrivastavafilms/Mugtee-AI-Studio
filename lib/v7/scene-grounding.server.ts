import 'server-only'

import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'
import type { V7CreativeBrief, V7ProductionSnapshot } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import {
  buildV7ScenePackages,
  validateV7ScenePackages,
} from '@/lib/v7/scene-package.server'

export type V7ScriptScene = V7ScriptDocument['scenes'][number]
export type V7StoryboardShot = V7StoryboardDocument['scenes'][number]['shots'][number]

export type V7SceneStoryboardRecord = {
  imageUrl?: string
  videoUrl?: string
  motionPresetId?: string
  shots?: V7StoryboardShot[]
  videoMetadata?: Record<string, unknown>
  videoCheckpointAt?: string
  videoGenerationStatus?: string
  imageMetadata?: {
    storagePath?: string
    promptArchive?: {
      action?: string
      location?: string
      sceneNumber?: number
    }
  }
  imageCheckpointAt?: string
}

export type GroundedV7SceneFields = {
  title: string
  description: string
  visualPrompt: string
  imagePrompt: string
  cameraAngle: string
  lightingMood: string
  environment: string
  colorPalette: string
  movementStyle: string
  duration: number
  imageUrl: string | null
  imageAssetPath: string | null
  videoUrl: string | null
  motionPresetId: string | null
}

function sceneNarrationText(scene: V7ScriptScene, shot?: V7StoryboardShot): string {
  return [scene.narration, shot?.dialogue, scene.dialogue]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function sceneVisualText(scene: V7ScriptScene, shot?: V7StoryboardShot): string {
  return [
    scene.action,
    scene.dialogue,
    shot?.dialogue,
    shot?.emotion ? `Emotion: ${shot.emotion}` : null,
    scene.emotion ? `Emotion: ${scene.emotion}` : null,
  ]
    .filter(Boolean)
    .join('. ')
    .trim()
}

export function resolveStoryboardCamera(
  shot?: V7StoryboardShot,
  scriptScene?: V7ScriptScene
): string {
  return (
    shot?.composition?.trim() ||
    shot?.camera?.trim() ||
    scriptScene?.camera?.trim() ||
    'Medium shot'
  )
}

export function buildCharacterGroundingBlock(
  bible: V7CharacterBible | null | undefined,
  scriptScene?: V7ScriptScene,
  brief?: V7CreativeBrief
): string {
  const characters = bible?.characters ?? []
  if (characters.length > 0) {
    const sceneNames = scriptScene?.characters ?? []
    const selected =
      sceneNames.length > 0
        ? characters.filter((character) => sceneNames.includes(character.name))
        : characters

    const cast = (selected.length > 0 ? selected : characters).slice(0, 3)
    return cast
      .map(
        (character) =>
          `${character.name} (${character.role}): face ${character.face}; hair ${character.hair}; body ${character.body}; costume ${character.costume}; accessories ${character.accessories.join(', ') || 'none'}; expressions ${character.expressions.join(', ') || 'natural'}`
      )
      .join('. ')
  }

  const names = [...new Set((scriptScene?.characters ?? []).filter(Boolean))]
  if (names.length > 0) {
    return `Characters (${names.join(', ')}): maintain identical face, hairstyle, wardrobe, and accessories in every scene.`
  }

  if (brief?.characterConsistency) {
    return 'Primary subject: consistent on-brand spokesperson with stable wardrobe, grooming, and expressions.'
  }

  return 'Subjects must match the screenplay scene — never generic stock portrait models.'
}

export function buildEnvironmentGroundingBlock(
  world: V7WorldBible | null | undefined,
  location: string,
  direction?: V7CreativeDirection,
  brief?: V7CreativeBrief
): string {
  const normalizedLocation = location.trim().toLowerCase()
  const matched =
    world?.locations.find((entry) => {
      const name = entry.name.trim().toLowerCase()
      return (
        normalizedLocation.includes(name) ||
        name.includes(normalizedLocation) ||
        normalizedLocation.length === 0
      )
    }) ?? world?.locations[0]

  if (matched) {
    return [
      `Location: ${matched.name}`,
      `Architecture: ${matched.architecture}`,
      `Props: ${matched.props.join(', ') || 'scene-specific props'}`,
      `Objects: ${matched.objects.join(', ') || 'set dressing'}`,
      `Lighting: ${matched.lighting}`,
      `Weather: ${matched.weather}`,
      `Time of day: ${matched.timeOfDay}`,
      `Textures: ${matched.textures.join(', ') || 'natural materials'}`,
      `Palette: ${matched.colorPalette.join(', ') || brief?.style || 'cinematic'}`,
    ].join('. ')
  }

  return [
    location ? `Location: ${location}` : null,
    brief?.location ? `Primary setting: ${brief.location}` : null,
    direction?.visualStyle,
    direction?.colorPalette.join(', '),
    direction?.lighting,
    brief?.emotion,
  ]
    .filter(Boolean)
    .join('. ')
}

export function buildGroundedV7SceneFields(params: {
  sceneNumber: number
  sceneId: string
  scriptScene?: V7ScriptScene
  shot?: V7StoryboardShot
  board?: V7SceneStoryboardRecord
  brief?: V7CreativeBrief
  direction?: V7CreativeDirection
  characterBible?: V7CharacterBible | null
  worldBible?: V7WorldBible | null
  fallbackDuration?: number
}): GroundedV7SceneFields {
  const { scriptScene, shot, board, brief, direction } = params
  const narration = sceneNarrationText(scriptScene ?? ({} as V7ScriptScene), shot)
  const visual = sceneVisualText(scriptScene ?? ({} as V7ScriptScene), shot)
  const location = scriptScene?.location ?? brief?.location ?? 'On location'

  return {
    title: scriptScene?.title ?? `Scene ${params.sceneNumber}`,
    description: narration,
    visualPrompt: visual || narration,
    imagePrompt: visual || narration,
    cameraAngle: resolveStoryboardCamera(shot, scriptScene),
    lightingMood: shot?.lighting ?? scriptScene?.lighting ?? direction?.lighting ?? 'Cinematic natural light',
    environment: location,
    colorPalette: direction?.colorPalette.join(', ') || brief?.style || 'Warm cinematic',
    movementStyle: shot?.movement ?? scriptScene?.movement ?? board?.motionPresetId ?? 'Slow push',
    duration:
      scriptScene?.duration ??
      shot?.timing ??
      params.fallbackDuration ??
      (brief ? brief.duration / Math.max(brief.sceneCount, 1) : 5),
    imageUrl: board?.imageUrl?.trim() || null,
    imageAssetPath: board?.imageMetadata?.storagePath?.trim() || null,
    videoUrl: board?.videoUrl?.trim() || null,
    motionPresetId: board?.motionPresetId?.trim() || null,
  }
}

export function groundedFieldsToGeneratedScene(
  sceneId: string,
  fields: GroundedV7SceneFields,
  options?: { allowImageAsVideoFallback?: boolean }
): GeneratedScene {
  const allowFallback = options?.allowImageAsVideoFallback !== false
  const resolvedVideoUrl = fields.videoUrl ?? (allowFallback ? fields.imageUrl : null)

  return {
    id: sceneId,
    title: fields.title,
    description: fields.description,
    duration: fields.duration,
    visualPrompt: fields.visualPrompt,
    imagePrompt: fields.imagePrompt,
    cameraAngle: fields.cameraAngle,
    lightingMood: fields.lightingMood,
    environment: fields.environment,
    colorPalette: fields.colorPalette,
    movementStyle: fields.movementStyle,
    imageUrl: fields.imageUrl,
    imageAssetPath: fields.imageAssetPath,
    thumbnailUrl: fields.imageUrl,
    videoUrl: resolvedVideoUrl,
    videoThumbnailUrl: fields.imageUrl,
    videoGenerationStatus: fields.videoUrl ? 'ready' : allowFallback && fields.imageUrl ? 'pending' : 'pending',
    ...(fields.motionPresetId ? { motionPresetId: fields.motionPresetId as GeneratedScene['motionPresetId'] } : {}),
  }
}

export function validateV7ProductionGrounding(snapshot: V7ProductionSnapshot): string[] {
  const brief = snapshot.production.creative_brief
  const packages = buildV7ScenePackages(snapshot)
  const packageIssues = validateV7ScenePackages(packages, brief, snapshot)

  if (packageIssues.length > 0) {
    return packageIssues
  }

  const issues: string[] = []

  for (const scene of snapshot.scenes) {
    const script = scene.script as Partial<V7ScriptScene>
    const board = (scene.storyboard ?? {}) as V7SceneStoryboardRecord
    const shot = board.shots?.[0]
    const sceneLabel = `Scene ${scene.number}`

    if (!script.action?.trim() && !script.narration?.trim() && !shot?.dialogue?.trim()) {
      issues.push(`${sceneLabel} missing screenplay action/narration`)
    }

    if (!board.shots?.length && !script.camera?.trim()) {
      issues.push(`${sceneLabel} missing storyboard shot plan`)
    }

    if (!resolveStoryboardCamera(shot, script as V7ScriptScene)) {
      issues.push(`${sceneLabel} missing camera plan`)
    }
  }

  const timeline = snapshot.production.timeline_json as { sceneCount?: number } | null
  if (timeline?.sceneCount != null && timeline.sceneCount !== snapshot.scenes.length) {
    issues.push(
      `Timeline scene count (${timeline.sceneCount}) ≠ storyboard scene count (${snapshot.scenes.length})`
    )
  }

  return issues
}

export function buildScreenplayNarration(script: V7ScriptDocument, storyboard?: V7StoryboardDocument): string {
  return script.scenes
    .map((scene) => {
      const shot = storyboard?.scenes.find((entry) => entry.number === scene.number)?.shots[0]
      return sceneNarrationText(scene, shot)
    })
    .filter(Boolean)
    .join('\n\n')
}
