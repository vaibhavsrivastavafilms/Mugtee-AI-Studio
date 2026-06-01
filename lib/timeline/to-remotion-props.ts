import type { GeneratedScene } from '@/lib/cinematic/generation'
import { buildReelSceneInput } from '@/lib/motion/apply-scene-motion'
import type { MotionPresetId } from '@/lib/motion/motion-presets'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import { timelineTransitionToMotion } from '@/types/timeline'
import type { TimelineProject } from '@/types/timeline'
import type { MugteeCompositionProps } from '@/lib/remotion/compositions/MugteeComposition'
import type { ReelSceneInput } from '@/lib/remotion/compositions/types'

/** Map TimelineProject → GeneratedScene[] for legacy render paths. */
export function timelineToGeneratedScenes(
  timeline: TimelineProject,
  existingScenes: GeneratedScene[] = []
): GeneratedScene[] {
  const byId = new Map(existingScenes.map((s) => [s.id, s]))
  return [...timeline.scenes]
    .sort((a, b) => a.order - b.order)
    .map((clip, index) => {
      const base = byId.get(clip.id)
      if (base) {
        return {
          ...base,
          title: clip.title ?? base.title,
          duration: clip.durationSec,
          imageUrl: clip.imageUrl ?? base.imageUrl,
          videoUrl: clip.videoUrl ?? base.videoUrl,
          motionPresetId:
            (clip.motionPresetId as MotionPresetId | undefined) ?? base.motionPresetId,
          description: clip.captionText ?? base.description,
        }
      }
      return {
        id: clip.id,
        title: clip.title ?? `Scene ${index + 1}`,
        description: clip.captionText ?? '',
        visualPrompt: '',
        imagePrompt: '',
        cameraAngle: '',
        lightingMood: '',
        environment: '',
        colorPalette: '',
        movementStyle: '',
        duration: clip.durationSec,
        imageUrl: clip.imageUrl,
        videoUrl: clip.videoUrl,
        motionPresetId: clip.motionPresetId as MotionPresetId | undefined,
      }
    })
}

export function buildSceneMotionFromTimeline(
  timeline: TimelineProject
): SceneMotionMap {
  const map: SceneMotionMap = { ...(timeline.sceneMotion ?? {}) }
  for (const clip of timeline.scenes) {
    const prev = map[clip.id]
    map[clip.id] = {
      ...(prev ?? {}),
      presetId:
        (clip.motionPresetId as MotionPresetId) ??
        prev?.presetId ??
        'historical_push_in',
      transitionType: timelineTransitionToMotion(clip.transition),
      duration: clip.durationSec,
    }
  }
  return map
}

/** Build Remotion player / render input props from timeline JSON. */
export function timelineToMugteeCompositionProps(
  timeline: TimelineProject
): MugteeCompositionProps {
  const scenes = timelineToGeneratedScenes(timeline)
  const sceneMotion = buildSceneMotionFromTimeline(timeline)
  const totalScenes = scenes.length

  const reelScenes: ReelSceneInput[] = scenes.map((scene, i) => {
    const clip = timeline.scenes.find((s) => s.id === scene.id)
    const imageSrc =
      clip?.imageUrl?.trim() ||
      scene.imageUrl?.trim() ||
      `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1920&fit=crop&q=80`

    const input = buildReelSceneInput(scene, i, {
      imageSrc,
      caption: clip?.captionText ?? '',
      sceneMotion,
      totalScenes,
    })

    const motion = input.motionConfig
    if (motion && clip) {
      const t = timelineTransitionToMotion(clip.transition)
      motion.transitionType = t
      if (clip.transition === 'slide') {
        motion.translateXFrom = motion.translateXFrom ?? -40
        motion.translateXTo = motion.translateXTo ?? 40
      }
      if (clip.transition === 'zoom') {
        motion.scaleFrom = motion.scaleFrom ?? 1
        motion.scaleTo = (motion.scaleTo ?? 1.12) + 0.08
      }
    }

    return input
  })

  const voice = timeline.audioTracks.find((a) => a.type === 'voice')
  const music = timeline.audioTracks.find((a) => a.type === 'music')

  return {
    title: timeline.title,
    scenes: reelScenes,
    voiceAudioSrc: voice?.url?.trim() || null,
    musicAudioSrc: music?.url?.trim() || null,
    voiceVolume: voice?.volume ?? 1,
    musicVolume: music?.volume ?? 0.18,
    captionTracks: timeline.captionTracks,
    resolution: {
      width: timeline.resolution.width,
      height: timeline.resolution.height,
    },
  }
}
