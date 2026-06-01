import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import {
  motionPresetIdFromBlueprint,
  type OutputAlignmentControls,
  type SceneBlueprint,
} from '@/lib/cinematic/scene-blueprint'
import { assignSceneMotion, type SceneMotionMap } from '@/lib/motion/motion-presets'
import type { VoiceMetadata } from '@/lib/voice/generateVoice'
import { buildCaptionCueForSegment } from '@/lib/reel/caption-sync'
import { computeSceneDurationSec, scaleDurationsToVoiceTotal } from '@/lib/reel/scene-timing'
import type { ReelAnimation, ReelTimeline, ReelTimelineClip, ReelTimelineEditPatch } from '@/lib/reel/types'
import {
  buildVoiceSegmentsForScenes,
  estimateVoiceDurationSec,
  sceneDurationsFromVoiceMetadata,
} from '@/lib/reel/voice-sync'

export type ComposeReelTimelineInput = {
  scenes: GeneratedScene[]
  sceneBlueprints?: SceneBlueprint[]
  sceneMotion?: SceneMotionMap | null
  outputAlignmentControls?: OutputAlignmentControls | null
  voiceUrl?: string | null
  voiceMetadata?: VoiceMetadata | null
  script?: string
  targetDurationSec?: number
}

function blueprintMap(blueprints: SceneBlueprint[]): Map<string, SceneBlueprint> {
  return new Map(blueprints.map((b) => [b.sceneId, b]))
}

function animationForScene(
  scene: GeneratedScene,
  sceneId: string,
  blueprint: SceneBlueprint | null,
  sceneMotion: SceneMotionMap,
  controls?: OutputAlignmentControls | null
): ReelAnimation {
  const motionEntry = sceneMotion[sceneId]
  const presetId =
    motionEntry?.presetId ??
    scene.motionPresetId ??
    (blueprint ? motionPresetIdFromBlueprint(blueprint, controls) : 'historical_push_in')

  return {
    presetId,
    transition: motionEntry?.transitionType ?? 'fade',
    motionType: motionEntry?.motionType,
  }
}

/** Compose a synchronized reel timeline from generated assets. */
export function composeReelTimeline(input: ComposeReelTimelineInput): ReelTimeline | null {
  const scenes = input.scenes.filter(Boolean)
  if (scenes.length === 0) return null

  const total = scenes.length
  const bpMap = blueprintMap(input.sceneBlueprints ?? [])
  const motionMap =
    input.sceneMotion && Object.keys(input.sceneMotion).length > 0
      ? input.sceneMotion
      : assignSceneMotion(scenes, null, null, {
          sceneBlueprints: input.sceneBlueprints,
          outputAlignmentControls: input.outputAlignmentControls,
        })

  const rawDurations = scenes.map((scene, i) =>
    computeSceneDurationSec(scene, i, total, bpMap.get(scene.id) ?? null)
  )

  const voiceDurationSec =
    input.voiceMetadata?.durationSec && input.voiceMetadata.durationSec > 0
      ? input.voiceMetadata.durationSec
      : estimateVoiceDurationSec(scenes, input.script)

  const sceneDurations =
    input.voiceMetadata?.durationSec && input.voiceMetadata.durationSec > 0
      ? sceneDurationsFromVoiceMetadata(scenes, voiceDurationSec, rawDurations)
      : scaleDurationsToVoiceTotal(
          rawDurations,
          input.targetDurationSec && input.targetDurationSec > 0
            ? input.targetDurationSec
            : voiceDurationSec
        )

  const voiceSegments = buildVoiceSegmentsForScenes(scenes, sceneDurations, voiceDurationSec)

  let cursor = 0
  const clips: ReelTimelineClip[] = scenes.map((scene, i) => {
    const sceneId = scene.id || `scene-${i + 1}`
    const blueprint = bpMap.get(sceneId) ?? null
    const duration = sceneDurations[i] ?? 4
    const startSec = cursor
    const endSec = startSec + duration
    cursor = endSec

    const voiceSegment = voiceSegments[i]!
    const image = scene.imageUrl?.trim() || resolveScenePreviewUrl(scene, i) || null
    const video = scene.videoUrl?.trim() || null

    return {
      sceneId,
      index: i,
      duration,
      startSec,
      endSec,
      image,
      video,
      voiceSegment,
      caption: buildCaptionCueForSegment(voiceSegment),
      animation: animationForScene(
        scene,
        sceneId,
        blueprint,
        motionMap,
        input.outputAlignmentControls
      ),
      emotion: blueprint?.emotion,
      title: scene.title || `Scene ${i + 1}`,
    }
  })

  const totalDurationSec =
    clips.length > 0 ? clips[clips.length - 1]!.endSec : voiceDurationSec

  return {
    version: 1,
    totalDurationSec: Math.round(totalDurationSec * 100) / 100,
    clips,
    voiceUrl: input.voiceUrl ?? null,
    composedAt: new Date().toISOString(),
  }
}

/** Apply a single-clip edit and recompute downstream timing. */
export function patchReelTimelineClip(
  timeline: ReelTimeline,
  sceneId: string,
  patch: ReelTimelineEditPatch
): ReelTimeline {
  const clipIndex = timeline.clips.findIndex((c) => c.sceneId === sceneId)
  if (clipIndex < 0) return timeline

  const clips = timeline.clips.map((c) => ({ ...c, voiceSegment: { ...c.voiceSegment }, caption: { ...c.caption, words: [...c.caption.words] }, animation: { ...c.animation } }))
  const clip = clips[clipIndex]!

  if (patch.duration != null && patch.duration > 0) {
    clip.duration = patch.duration
  }
  if (patch.presetId) clip.animation.presetId = patch.presetId
  if (patch.transition) clip.animation.transition = patch.transition
  if (patch.voiceText != null) clip.voiceSegment.text = patch.voiceText
  if (patch.captionText != null) clip.caption.text = patch.captionText
  if (patch.captionStartSec != null) clip.caption.startSec = patch.captionStartSec
  if (patch.captionEndSec != null) clip.caption.endSec = patch.captionEndSec

  let cursor = 0
  let audioOffset = 0
  for (const c of clips) {
    c.startSec = cursor
    c.endSec = cursor + c.duration
    c.voiceSegment.startSec = c.startSec
    c.voiceSegment.endSec = c.endSec
    c.voiceSegment.audioOffsetSec = audioOffset
    c.voiceSegment.durationSec = c.duration
    if (patch.captionStartSec == null && patch.captionEndSec == null) {
      c.caption.startSec = c.startSec
      c.caption.endSec = c.endSec
    }
    cursor = c.endSec
    audioOffset += c.duration
  }

  return {
    ...timeline,
    clips,
    totalDurationSec: clips.length ? clips[clips.length - 1]!.endSec : timeline.totalDurationSec,
    composedAt: new Date().toISOString(),
  }
}

export function reelTimelineToSceneDurations(timeline: ReelTimeline): Record<string, number> {
  const map: Record<string, number> = {}
  for (const clip of timeline.clips) {
    map[clip.sceneId] = clip.duration
  }
  return map
}
