import 'server-only'

import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SubtitleSegment } from '@/lib/video/types'
import type { V7CharacterBible } from '@/agents/v7/character-director.server'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'
import type { V7WorldBible } from '@/agents/v7/world-builder.server'
import type { V7CreativeBrief, V7ProductionSnapshot } from '@/types/v7/production'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'
import type { V7SoundEffect } from '@/lib/v3/sound-cascade.server'
import {
  assertProductionRenderAllowed,
  assertRealVoiceRequired,
  isSlideshowOrFallbackVideo,
  slideshowVideoBlockerMessage,
} from '@/lib/v7/production-integrity.server'
import {
  buildGroundedV7SceneFields,
  buildScreenplayNarration,
  type GroundedV7SceneFields,
  type V7SceneStoryboardRecord,
  type V7ScriptScene,
  type V7StoryboardShot,
} from '@/lib/v7/scene-grounding.server'

export type V7ShotPackage = {
  sceneId: string
  sceneNumber: number
  shotIndex: number
  durationSec: number
  description: string
  narration: string
  dialogue: string
  camera: string
  lighting: string
  emotion: string
  imageUrl: string | null
  videoUrl: string | null
  continuityId: string
}

export type V7SoundTimelineTrack = {
  name: string
  url: string
  startSec: number
  sceneNumber?: number
}

export type V7SceneCaptionSegment = {
  startSec: number
  endSec: number
  text: string
  speaker: string
}

export type V7ScenePackage = {
  sceneId: string
  sceneNumber: number
  durationSec: number
  sceneDescription: string
  narration: string
  dialogue: string
  characterIds: string[]
  environmentId: string
  cameraPlan: string
  lighting: string
  mood: string
  emotion: string
  shotType: string
  continuityId: string
  aspectRatio: string
  motionNotes: string
  imageUrl: string | null
  imageAssetPath: string | null
  videoUrl: string | null
  imageProvider: string | null
  videoProvider: string | null
  imageCheckpointAt: string | null
  videoCheckpointAt: string | null
  captions: V7SceneCaptionSegment[]
  shots: V7ShotPackage[]
}

export type V7ProductionTimeline = {
  sceneCount: number
  shotCount: number
  durationSec: number
  voiceUrl: string | null
  musicUrl: string | null
  soundTracks: V7SoundTimelineTrack[]
  scenes: Array<{
    sceneId: string
    number: number
    title: string
    durationSec: number
    location: string
    narration: string
    dialogue: string
    camera: string
    imageUrl: string | null
    videoUrl: string | null
    continuityId: string
    provider: string | null
    imageCheckpointAt: string | null
    videoCheckpointAt: string | null
    transition: string
    captions: V7SceneCaptionSegment[]
    shots: V7ShotPackage[]
  }>
  shots: V7ShotPackage[]
}

export type V7StageBibles = {
  characterBible: V7CharacterBible | null
  worldBible: V7WorldBible | null
  direction: V7CreativeDirection | null
}

export function loadV7StageBibles(snapshot: V7ProductionSnapshot): V7StageBibles {
  const characterStage = snapshot.stages.find((row) => row.stage === 'character')
  const worldStage = snapshot.stages.find((row) => row.stage === 'world')
  const creativeStage = snapshot.stages.find((row) => row.stage === 'creative')

  return {
    characterBible:
      (characterStage?.output as { bible?: V7CharacterBible } | null)?.bible ?? null,
    worldBible: (worldStage?.output as { world?: V7WorldBible } | null)?.world ?? null,
    direction:
      (creativeStage?.output as { direction?: V7CreativeDirection } | null)?.direction ?? null,
  }
}

function sceneSpeaker(scriptScene: V7ScriptScene, shot?: V7StoryboardShot): string {
  if (shot?.dialogue?.trim() || scriptScene.dialogue?.trim()) {
    const name = scriptScene.characters?.[0]?.trim()
    return name || 'Speaker'
  }
  return 'Narrator'
}

function sceneDialogueText(scriptScene: V7ScriptScene, shot?: V7StoryboardShot): string {
  return [shot?.dialogue, scriptScene.dialogue].filter(Boolean).join(' ').trim()
}

function buildV7ShotPackages(params: {
  sceneId: string
  sceneNumber: number
  productionId: string
  script: V7ScriptScene
  board: V7SceneStoryboardRecord
  sceneDurationSec: number
  imageUrl: string | null
  videoUrl: string | null
}): V7ShotPackage[] {
  const storyboardShots = params.board.shots ?? []
  const shotCount = Math.max(storyboardShots.length, 1)
  const perShotDuration = params.sceneDurationSec / shotCount

  if (storyboardShots.length === 0) {
    return [
      {
        sceneId: params.sceneId,
        sceneNumber: params.sceneNumber,
        shotIndex: 0,
        durationSec: params.sceneDurationSec,
        description: params.script.action ?? params.script.narration ?? '',
        narration: params.script.narration ?? '',
        dialogue: params.script.dialogue ?? '',
        camera: params.script.camera ?? 'Medium shot',
        lighting: params.script.lighting ?? 'Cinematic natural light',
        emotion: params.script.emotion ?? 'Natural',
        imageUrl: params.imageUrl,
        videoUrl: params.videoUrl,
        continuityId: `${params.productionId}:scene-${params.sceneNumber}:shot-0`,
      },
    ]
  }

  return storyboardShots.map((shot, shotIndex) => ({
    sceneId: params.sceneId,
    sceneNumber: params.sceneNumber,
    shotIndex,
    durationSec: Math.max(1, shot.timing ?? perShotDuration),
    description: [params.script.action, shot.dialogue, shot.emotion ? `Emotion: ${shot.emotion}` : null]
      .filter(Boolean)
      .join('. '),
    narration: params.script.narration ?? '',
    dialogue: [shot.dialogue, params.script.dialogue].filter(Boolean).join(' ').trim(),
    camera: shot.composition ?? shot.camera ?? params.script.camera ?? 'Medium shot',
    lighting: shot.lighting ?? params.script.lighting ?? 'Cinematic natural light',
    emotion: shot.emotion ?? params.script.emotion ?? 'Natural',
    imageUrl: params.imageUrl,
    videoUrl: params.videoUrl,
    continuityId: `${params.productionId}:scene-${params.sceneNumber}:shot-${shotIndex}`,
  }))
}

export function countStoryboardShots(snapshot: V7ProductionSnapshot): number {
  return snapshot.scenes.reduce((sum, scene) => {
    const board = (scene.storyboard ?? {}) as V7SceneStoryboardRecord
    return sum + Math.max(board.shots?.length ?? 0, 1)
  }, 0)
}

export function buildV7VoiceNarrationSegments(snapshot: V7ProductionSnapshot): Array<{
  sceneNumber: number
  sceneId: string
  text: string
  durationSec: number
  emotion: string
}> {
  const packages = buildV7ScenePackages(snapshot)
  return packages
    .map((pkg) => {
      const text = pkg.narration.trim()
      return {
        sceneNumber: pkg.sceneNumber,
        sceneId: pkg.sceneId,
        text,
        durationSec: pkg.durationSec,
        emotion: pkg.emotion,
      }
    })
    .filter((segment) => segment.text.length > 0)
}

export function mergeV7VoiceNarration(snapshot: V7ProductionSnapshot): string {
  return buildV7VoiceNarrationSegments(snapshot)
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join('\n\n')
}

function buildCaptionSegmentsForPackages(
  packages: V7ScenePackage[]
): V7SceneCaptionSegment[] {
  let cursor = 0
  const segments: V7SceneCaptionSegment[] = []

  for (const pkg of packages) {
    const text = pkg.narration.trim() || pkg.dialogue.trim()
    if (!text) continue
    const dur = Math.max(2, pkg.durationSec)
    segments.push({
      startSec: cursor,
      endSec: cursor + dur,
      text,
      speaker: pkg.dialogue.trim() ? sceneSpeaker({ dialogue: pkg.dialogue } as V7ScriptScene) : 'Narrator',
    })
    cursor += dur
  }

  return segments
}

export function buildV7ScenePackages(snapshot: V7ProductionSnapshot): V7ScenePackage[] {
  const brief = snapshot.production.creative_brief
  const bibles = loadV7StageBibles(snapshot)
  const productionId = snapshot.production.id
  const aspectRatio = brief?.aspectRatio ?? '9:16'

  const packages = snapshot.scenes.map((scene) => {
    const script = scene.script as V7ScriptScene
    const board = (scene.storyboard ?? {}) as V7SceneStoryboardRecord
    const shot = board.shots?.[0] as V7StoryboardShot | undefined
    const continuityId = `${productionId}:scene-${scene.number}`

    const fields = buildGroundedV7SceneFields({
      sceneNumber: scene.number,
      sceneId: scene.id,
      scriptScene: script,
      shot,
      board,
      brief: brief ?? undefined,
      direction: bibles.direction ?? undefined,
      characterBible: bibles.characterBible,
      worldBible: bibles.worldBible,
      fallbackDuration: scene.duration ?? undefined,
    })

    const narration = fields.description.trim()
    const dialogue = sceneDialogueText(script, shot)
    const videoMeta = board.videoMetadata as { provider?: string; fallback?: boolean } | undefined
    const imageMeta = board.imageMetadata as { provider?: string } | undefined

    const shots = buildV7ShotPackages({
      sceneId: scene.id,
      sceneNumber: scene.number,
      productionId,
      script,
      board,
      sceneDurationSec: fields.duration,
      imageUrl: fields.imageUrl,
      videoUrl: fields.videoUrl,
    })

    return {
      sceneId: scene.id,
      sceneNumber: scene.number,
      durationSec: fields.duration,
      sceneDescription: fields.visualPrompt || narration,
      narration,
      dialogue,
      characterIds: script.characters ?? [],
      environmentId: script.location?.trim() || brief?.location?.trim() || fields.environment,
      cameraPlan: fields.cameraAngle,
      lighting: fields.lightingMood,
      mood: brief?.emotion ?? shot?.emotion ?? script.emotion ?? 'Cinematic',
      emotion: shot?.emotion ?? script.emotion ?? brief?.emotion ?? 'Natural',
      shotType: shot?.composition?.trim() || shot?.camera?.trim() || fields.cameraAngle,
      continuityId,
      aspectRatio,
      motionNotes: fields.movementStyle,
      imageUrl: fields.imageUrl,
      imageAssetPath: fields.imageAssetPath,
      videoUrl: fields.videoUrl,
      imageProvider: imageMeta?.provider ?? null,
      videoProvider:
        videoMeta?.provider ??
        ((snapshot.production.timeline_json as { animationProvider?: string } | null)
          ?.animationProvider ??
          null),
      imageCheckpointAt: board.imageCheckpointAt ?? null,
      videoCheckpointAt: board.videoCheckpointAt ?? null,
      captions: [] as V7SceneCaptionSegment[],
      shots,
    } satisfies V7ScenePackage
  })

  const captionSegments = buildCaptionSegmentsForPackages(packages)
  let captionIdx = 0
  for (const pkg of packages) {
    const text = pkg.narration.trim() || pkg.dialogue.trim()
    if (!text) continue
    const segment = captionSegments[captionIdx]
    if (segment) {
      pkg.captions = [segment]
      captionIdx += 1
    }
  }

  return packages
}

export function buildV7TimelineFromPackages(packages: V7ScenePackage[]): V7ProductionTimeline {
  const allShots = packages.flatMap((pkg) => pkg.shots)
  return {
    sceneCount: packages.length,
    shotCount: allShots.length,
    durationSec: packages.reduce((sum, pkg) => sum + Math.max(2, pkg.durationSec), 0),
    voiceUrl: null,
    musicUrl: null,
    soundTracks: [],
    shots: allShots,
    scenes: packages.map((pkg) => ({
      sceneId: pkg.sceneId,
      number: pkg.sceneNumber,
      title: `Scene ${pkg.sceneNumber}`,
      durationSec: pkg.durationSec,
      location: pkg.environmentId,
      narration: pkg.narration,
      dialogue: pkg.dialogue,
      camera: pkg.cameraPlan,
      imageUrl: pkg.imageUrl,
      videoUrl: pkg.videoUrl,
      continuityId: pkg.continuityId,
      provider: pkg.videoProvider ?? pkg.imageProvider,
      imageCheckpointAt: pkg.imageCheckpointAt,
      videoCheckpointAt: pkg.videoCheckpointAt,
      transition: 'cut',
      captions: pkg.captions,
      shots: pkg.shots,
    })),
  }
}

export function buildV7ProductionTimeline(params: {
  snapshot: V7ProductionSnapshot
  sfx?: V7SoundEffect[]
}): V7ProductionTimeline {
  const packages = buildV7ScenePackages(params.snapshot)
  const timeline = buildV7TimelineFromPackages(packages)
  const { production } = params.snapshot
  const soundStage = params.snapshot.stages.find((row) => row.stage === 'sound')
  const stageSfx =
    (soundStage?.output as { sfx?: V7SoundEffect[] } | null)?.sfx ??
    params.sfx ??
    []

  let sfxCursor = 0
  const soundTracks: V7SoundTimelineTrack[] = stageSfx.map((track, index) => {
    const sceneNumber = params.snapshot.scenes[index]?.number
    const startSec = track.startSec ?? sfxCursor
    sfxCursor = startSec + 4
    return {
      name: track.name,
      url: track.url,
      startSec,
      sceneNumber,
    }
  })

  return {
    ...timeline,
    voiceUrl: production.voice_url,
    musicUrl: production.music_url,
    soundTracks,
  }
}

export function buildV7TimelineFromScript(params: {
  script: V7ScriptDocument
  brief: V7CreativeBrief
  productionId?: string
}): V7ProductionTimeline {
  const aspectRatio = params.brief.aspectRatio
  const packages: V7ScenePackage[] = params.script.scenes.map((scene) => {
    const shotDuration =
      scene.duration ?? params.brief.duration / Math.max(params.brief.sceneCount, 1)
    const continuityId = params.productionId
      ? `${params.productionId}:scene-${scene.number}`
      : `scene-${scene.number}`

    return {
      sceneId: `script-scene-${scene.number}`,
      sceneNumber: scene.number,
      durationSec: shotDuration,
      sceneDescription: scene.action ?? scene.narration ?? scene.title,
      narration: scene.narration?.trim() ?? '',
      dialogue: scene.dialogue?.trim() ?? '',
      characterIds: scene.characters ?? [],
      environmentId: scene.location?.trim() || params.brief.location?.trim() || 'On location',
      cameraPlan: scene.camera?.trim() || 'Medium shot',
      lighting: scene.lighting?.trim() || 'Cinematic natural light',
      mood: params.brief.emotion,
      emotion: scene.emotion ?? params.brief.emotion,
      shotType: scene.camera?.trim() || 'Medium shot',
      continuityId,
      aspectRatio,
      motionNotes: scene.movement?.trim() || 'Slow push',
      imageUrl: null,
      imageAssetPath: null,
      videoUrl: null,
      imageProvider: null,
      videoProvider: null,
      imageCheckpointAt: null,
      videoCheckpointAt: null,
      captions: [],
      shots: [
        {
          sceneId: `script-scene-${scene.number}`,
          sceneNumber: scene.number,
          shotIndex: 0,
          durationSec: shotDuration,
          description: scene.action ?? scene.narration ?? scene.title ?? '',
          narration: scene.narration?.trim() ?? '',
          dialogue: scene.dialogue?.trim() ?? '',
          camera: scene.camera?.trim() || 'Medium shot',
          lighting: scene.lighting?.trim() || 'Cinematic natural light',
          emotion: scene.emotion ?? params.brief.emotion,
          imageUrl: null,
          videoUrl: null,
          continuityId,
        },
      ],
    }
  })

  const captionSegments = buildCaptionSegmentsForPackages(packages)
  let captionIdx = 0
  for (const pkg of packages) {
    const text = pkg.narration.trim() || pkg.dialogue.trim()
    if (!text) continue
    const segment = captionSegments[captionIdx]
    if (segment) {
      pkg.captions = [segment]
      captionIdx += 1
    }
  }

  return buildV7TimelineFromPackages(packages)
}

export function scenePackageToGeneratedScene(
  pkg: V7ScenePackage,
  fields?: GroundedV7SceneFields
): GeneratedScene {
  const grounded =
    fields ??
    ({
      title: `Scene ${pkg.sceneNumber}`,
      description: pkg.narration || pkg.dialogue || pkg.sceneDescription,
      visualPrompt: pkg.sceneDescription,
      imagePrompt: pkg.sceneDescription,
      cameraAngle: pkg.cameraPlan,
      lightingMood: pkg.lighting,
      environment: pkg.environmentId,
      colorPalette: 'Warm cinematic',
      movementStyle: pkg.motionNotes,
      duration: pkg.durationSec,
      imageUrl: pkg.imageUrl,
      imageAssetPath: pkg.imageAssetPath,
      videoUrl: pkg.videoUrl,
      motionPresetId: null,
    } satisfies GroundedV7SceneFields)

  return {
    id: pkg.sceneId,
    title: grounded.title,
    description: grounded.description,
    duration: grounded.duration,
    visualPrompt: grounded.visualPrompt,
    imagePrompt: grounded.imagePrompt,
    cameraAngle: grounded.cameraAngle,
    lightingMood: grounded.lightingMood,
    environment: grounded.environment,
    colorPalette: grounded.colorPalette,
    movementStyle: grounded.movementStyle,
    imageUrl: grounded.imageUrl,
    imageAssetPath: grounded.imageAssetPath,
    thumbnailUrl: grounded.imageUrl,
    videoUrl: grounded.videoUrl ?? undefined,
    videoThumbnailUrl: grounded.imageUrl,
    videoProvider: pkg.videoProvider,
    videoGenerationStatus: grounded.videoUrl ? 'ready' : 'pending',
  }
}

export function packagesToSubtitleSegments(packages: V7ScenePackage[]): SubtitleSegment[] {
  const segments: SubtitleSegment[] = []
  for (const pkg of packages) {
    for (const caption of pkg.captions) {
      if (!caption.text.trim()) continue
      segments.push({
        startSec: caption.startSec,
        endSec: caption.endSec,
        text: caption.text,
      })
    }
  }
  return segments
}

export type V7SceneDebugRow = {
  sceneNumber: number
  image: boolean
  video: boolean
  narration: boolean
  caption: boolean
  durationSec: number
  imageProvider: string | null
  videoProvider: string | null
  ok: boolean
  issues: string[]
}

export function buildV7ProductionDebugReport(packages: V7ScenePackage[]): {
  scenes: V7SceneDebugRow[]
  passed: boolean
  issueCount: number
} {
  const scenes: V7SceneDebugRow[] = packages.map((pkg) => {
    const issues: string[] = []
    const hasImage = Boolean(pkg.imageUrl?.trim()) && !isEphemeralRemoteImageUrl(pkg.imageUrl!)
    const hasVideo = Boolean(pkg.videoUrl?.trim()) && !isEphemeralRemoteImageUrl(pkg.videoUrl!)
    const hasNarration = Boolean(pkg.narration.trim() || pkg.dialogue.trim())
    const hasCaption = pkg.captions.some((c) => c.text.trim())

    if (!hasImage) issues.push('missing image')
    if (!hasVideo) issues.push('missing video')
    if (!hasNarration) issues.push('missing narration')
    if (!hasCaption) issues.push('missing caption')
    if (pkg.durationSec <= 0) issues.push('invalid duration')
    if (!pkg.imageCheckpointAt) issues.push('missing image checkpoint')

    return {
      sceneNumber: pkg.sceneNumber,
      image: hasImage,
      video: hasVideo,
      narration: hasNarration,
      caption: hasCaption,
      durationSec: pkg.durationSec,
      imageProvider: pkg.imageProvider,
      videoProvider: pkg.videoProvider,
      ok: issues.length === 0,
      issues,
    }
  })

  const issueCount = scenes.reduce((sum, row) => sum + row.issues.length, 0)
  return { scenes, passed: issueCount === 0, issueCount }
}

/** Developer-only structured log — never surfaced in UI. */
export function logV7ProductionDebugReport(params: {
  productionId: string
  packages: V7ScenePackage[]
  extraIssues?: string[]
}): void {
  const report = buildV7ProductionDebugReport(params.packages)
  console.info(
    '[V7_PRODUCTION_DEBUG]',
    JSON.stringify({
      productionId: params.productionId,
      sceneCount: params.packages.length,
      passed: report.passed && (params.extraIssues?.length ?? 0) === 0,
      scenes: report.scenes,
      extraIssues: params.extraIssues ?? [],
    })
  )
}

export function validateV7ScenePackages(
  packages: V7ScenePackage[],
  brief?: V7CreativeBrief | null,
  snapshot?: V7ProductionSnapshot | null
): string[] {
  const issues: string[] = []

  if (packages.length === 0) {
    issues.push('No storyboard scenes found')
    return issues
  }

  const videoUrls = new Set<string>()
  const imageUrls = new Set<string>()

  for (const pkg of packages) {
    const label = `Scene ${pkg.sceneNumber}`
    const scene = snapshot?.scenes.find((row) => row.id === pkg.sceneId)
    const board = (scene?.storyboard ?? null) as Record<string, unknown> | null
    const videoMeta = board?.videoMetadata as { fallback?: boolean; provider?: string } | undefined

    if (!pkg.narration.trim() && !pkg.dialogue.trim()) {
      issues.push(`${label} missing screenplay narration/dialogue`)
    }

    if (!pkg.imageUrl?.trim()) {
      issues.push(`${label} missing storyboard image`)
    } else if (isEphemeralRemoteImageUrl(pkg.imageUrl)) {
      issues.push(`${label} image not persisted`)
    } else if (imageUrls.has(pkg.imageUrl)) {
      issues.push(`${label} duplicate image URL — scenes must be distinct`)
    } else {
      imageUrls.add(pkg.imageUrl)
    }

    if (!pkg.videoUrl?.trim()) {
      issues.push(`${label} missing scene video clip`)
    } else if (isEphemeralRemoteImageUrl(pkg.videoUrl)) {
      issues.push(`${label} video not persisted`)
    } else if (videoUrls.has(pkg.videoUrl)) {
      issues.push(`${label} duplicate video clip — never repeat footage`)
    } else if (pkg.imageUrl?.trim() && pkg.videoUrl.trim() === pkg.imageUrl.trim()) {
      issues.push(`${label} video URL equals image URL — portrait/still fallback rejected`)
    } else {
      videoUrls.add(pkg.videoUrl)
    }

    if (videoMeta?.fallback === true || isSlideshowOrFallbackVideo({
      provider: videoMeta?.provider ?? pkg.videoProvider,
      fallback: videoMeta?.fallback,
      videoUrl: pkg.videoUrl,
      imageUrl: pkg.imageUrl,
    })) {
      issues.push(slideshowVideoBlockerMessage(label))
    }

    if (!pkg.imageCheckpointAt) {
      issues.push(`${label} missing image checkpoint`)
    }

    if (!pkg.videoCheckpointAt) {
      issues.push(`${label} missing video checkpoint`)
    }

    if (!pkg.captions.some((c) => c.text.trim())) {
      issues.push(`${label} missing caption segment`)
    }

    if (pkg.durationSec <= 0) {
      issues.push(`${label} invalid duration`)
    }
  }

  const expectedCount = snapshot?.scenes.length ?? brief?.sceneCount ?? packages.length
  if (packages.length !== expectedCount) {
    issues.push(
      `Storyboard scene count (${packages.length}) ≠ screenplay scene count (${expectedCount})`
    )
  }

  const timelineDuration = packages.reduce((sum, pkg) => sum + Math.max(2, pkg.durationSec), 0)
  if (brief && Math.abs(timelineDuration - brief.duration) > Math.max(8, brief.duration * 0.35)) {
    issues.push(
      `Timeline duration (${Math.round(timelineDuration)}s) differs significantly from brief (${brief.duration}s)`
    )
  }

  const narrationPresent = packages.some((pkg) => pkg.narration.trim() || pkg.dialogue.trim())
  if (!narrationPresent) {
    issues.push('Narration missing for all scenes')
  }

  return issues
}
