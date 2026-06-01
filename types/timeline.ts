import type { WordTiming } from '@/lib/cinematic/captions/word-timing'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { composeReelTimeline } from '@/lib/reel/compose-reel-timeline'
import type { ReelTimeline } from '@/lib/reel/types'
import type { MotionPresetId } from '@/lib/motion/motion-presets'
import type { SceneMotionMap, TransitionType } from '@/lib/motion/scene-motion-types'
import { REEL_FPS } from '@/lib/remotion/compositions/constants'

export const TIMELINE_VERSION = 1 as const

export type TimelineResolutionPreset =
  | '1080x1920'
  | '720x1280'
  | '1080x1080'
  | '1920x1080'

export type TimelineTransition =
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'crossDissolve'
  | 'cut'

export type TimelineCaptionStyle = 'tiktok' | 'minimal'

export type TimelineResolution = {
  width: number
  height: number
  preset: TimelineResolutionPreset
}

export type TimelineSceneClip = {
  id: string
  order: number
  durationSec: number
  imageUrl: string | null
  videoUrl: string | null
  title?: string
  transition: TimelineTransition
  motionPresetId?: string
  captionText?: string
}

export type TimelineAudioClip = {
  id: string
  type: 'voice' | 'music'
  url: string
  volume: number
  startSec: number
}

export type TimelineCaptionClip = {
  id: string
  sceneId: string
  text: string
  startSec: number
  endSec: number
  style: TimelineCaptionStyle
  words?: WordTiming[]
}

export type TimelineProject = {
  version: typeof TIMELINE_VERSION
  projectId: string | null
  title: string
  fps: number
  resolution: TimelineResolution
  scenes: TimelineSceneClip[]
  audioTracks: TimelineAudioClip[]
  captionTracks: TimelineCaptionClip[]
  sceneMotion?: SceneMotionMap
  totalDurationSec: number
  updatedAt: string
}

export const TIMELINE_RESOLUTION_PRESETS: Record<
  TimelineResolutionPreset,
  { width: number; height: number }
> = {
  '1080x1920': { width: 1080, height: 1920 },
  '720x1280': { width: 720, height: 1280 },
  '1080x1080': { width: 1080, height: 1080 },
  '1920x1080': { width: 1920, height: 1080 },
}

export function defaultTimelineResolution(
  preset: TimelineResolutionPreset = '1080x1920'
): TimelineResolution {
  const dims = TIMELINE_RESOLUTION_PRESETS[preset]
  return { ...dims, preset }
}

export function timelineTransitionToMotion(
  transition: TimelineTransition
): TransitionType {
  switch (transition) {
    case 'crossDissolve':
      return 'cross_dissolve'
    case 'cut':
      return 'cut'
    case 'fade':
    case 'slide':
    case 'zoom':
    default:
      return 'fade'
  }
}

export function motionTransitionToTimeline(
  transition?: TransitionType | null
): TimelineTransition {
  if (transition === 'cross_dissolve') return 'crossDissolve'
  if (transition === 'cut') return 'cut'
  return 'fade'
}

function computeTotalDurationSec(scenes: TimelineSceneClip[]): number {
  return scenes.reduce((sum, s) => sum + Math.max(0.5, s.durationSec), 0)
}

/** Quick Cut store snapshot for timeline conversion. */
export type QuickCutTimelineSource = {
  savedProjectId: string | null
  title: string
  scenes: GeneratedScene[]
  voiceUrl: string | null
  voiceMetadata?: import('@/lib/voice/generateVoice').VoiceMetadata | null
  script?: string
  duration?: number
  sceneMotion?: SceneMotionMap
  sceneBlueprints?: import('@/lib/cinematic/scene-blueprint').SceneBlueprint[]
  outputAlignmentControls?: import('@/lib/cinematic/scene-blueprint').OutputAlignmentControls
  reelTimeline?: ReelTimeline | null
  resolutionPreset?: TimelineResolutionPreset
}

/** Convert store / reel timeline state → editor TimelineProject. */
export function buildTimelineFromQuickCutStore(
  source: QuickCutTimelineSource
): TimelineProject | null {
  const scenes = source.scenes.filter(Boolean)
  if (scenes.length < 1) return null

  const reelTimeline =
    source.reelTimeline ??
    composeReelTimeline({
      scenes,
      sceneBlueprints: source.sceneBlueprints,
      sceneMotion: source.sceneMotion,
      outputAlignmentControls: source.outputAlignmentControls,
      voiceUrl: source.voiceUrl,
      voiceMetadata: source.voiceMetadata ?? null,
      script: source.script,
      targetDurationSec: source.duration,
    })

  const clipByScene = new Map(
    (reelTimeline?.clips ?? []).map((c) => [c.sceneId, c])
  )

  const timelineScenes: TimelineSceneClip[] = scenes.map((scene, index) => {
    const clip = clipByScene.get(scene.id)
    const motion = source.sceneMotion?.[scene.id]
    return {
      id: scene.id,
      order: index,
      durationSec: clip?.duration ?? scene.duration ?? 4,
      imageUrl:
        scene.imageUrl?.trim() ||
        clip?.image?.trim() ||
        resolveScenePreviewUrl(scene, index) ||
        null,
      videoUrl: scene.videoUrl?.trim() || clip?.video?.trim() || null,
      title: scene.title?.trim() || clip?.title || `Scene ${index + 1}`,
      transition: motionTransitionToTimeline(
        motion?.transitionType ?? clip?.animation.transition
      ),
      motionPresetId:
        motion?.presetId ?? clip?.animation.presetId ?? scene.motionPresetId,
      captionText: clip?.caption.text?.trim() || scene.description?.trim(),
    }
  })

  const captionTracks: TimelineCaptionClip[] =
    reelTimeline?.clips.map((clip, i) => ({
      id: `caption-${clip.sceneId}`,
      sceneId: clip.sceneId,
      text: clip.caption.text,
      startSec: clip.caption.startSec,
      endSec: clip.caption.endSec,
      style: 'tiktok' as TimelineCaptionStyle,
      words: clip.caption.words,
    })) ??
    timelineScenes.map((s, i) => ({
      id: `caption-${s.id}`,
      sceneId: s.id,
      text: s.captionText ?? '',
      startSec: timelineScenes
        .slice(0, i)
        .reduce((sum, x) => sum + x.durationSec, 0),
      endSec:
        timelineScenes.slice(0, i + 1).reduce((sum, x) => sum + x.durationSec, 0),
      style: 'tiktok' as TimelineCaptionStyle,
    }))

  const audioTracks: TimelineAudioClip[] = []
  if (source.voiceUrl?.trim()) {
    audioTracks.push({
      id: 'voice-main',
      type: 'voice',
      url: source.voiceUrl.trim(),
      volume: 1,
      startSec: 0,
    })
  }

  const preset = source.resolutionPreset ?? '1080x1920'

  return {
    version: TIMELINE_VERSION,
    projectId: source.savedProjectId,
    title: source.title || 'Untitled',
    fps: REEL_FPS,
    resolution: defaultTimelineResolution(preset),
    scenes: timelineScenes,
    audioTracks,
    captionTracks,
    sceneMotion: source.sceneMotion,
    totalDurationSec: computeTotalDurationSec(timelineScenes),
    updatedAt: new Date().toISOString(),
  }
}

/** Patch to apply timeline edits back onto the quick-cut store. */
export type TimelineStorePatch = {
  scenes: GeneratedScene[]
  sceneMotion: SceneMotionMap
  reelTimeline: ReelTimeline | null
  duration: number
  timelineJson: TimelineProject
}

/** Reverse hydration: timeline JSON → store fields. */
export function applyTimelineToStore(
  timeline: TimelineProject,
  existingScenes: GeneratedScene[]
): TimelineStorePatch {
  const byId = new Map(existingScenes.map((s) => [s.id, s]))
  let cursor = 0

  const scenes: GeneratedScene[] = [...timeline.scenes]
    .sort((a, b) => a.order - b.order)
    .map((clip, index) => {
      const base = byId.get(clip.id) ?? existingScenes[index]
      const startSec = cursor
      cursor += clip.durationSec
      return {
        ...(base ?? {
          id: clip.id,
          title: clip.title ?? `Scene ${index + 1}`,
          description: clip.captionText ?? '',
          visualPrompt: '',
          duration: clip.durationSec,
        }),
        id: clip.id,
        title: clip.title ?? base?.title ?? `Scene ${index + 1}`,
        duration: clip.durationSec,
        imageUrl: clip.imageUrl ?? base?.imageUrl ?? null,
        videoUrl: clip.videoUrl ?? base?.videoUrl ?? null,
        motionPresetId:
          (clip.motionPresetId as MotionPresetId | undefined) ?? base?.motionPresetId,
      }
    })

  const sceneMotion: SceneMotionMap = { ...(timeline.sceneMotion ?? {}) }
  for (const clip of timeline.scenes) {
    const prev = sceneMotion[clip.id]
    sceneMotion[clip.id] = {
      ...(prev ?? {}),
      presetId:
        (clip.motionPresetId as MotionPresetId) ??
        prev?.presetId ??
        'historical_push_in',
      transitionType: timelineTransitionToMotion(clip.transition),
      duration: clip.durationSec,
    }
  }

  const reelTimeline = composeReelTimeline({
    scenes,
    sceneMotion,
    voiceUrl: timeline.audioTracks.find((a) => a.type === 'voice')?.url ?? null,
    targetDurationSec: timeline.totalDurationSec,
  })

  return {
    scenes,
    sceneMotion,
    reelTimeline,
    duration: Math.round(timeline.totalDurationSec) || 60,
    timelineJson: {
      ...timeline,
      totalDurationSec: computeTotalDurationSec(timeline.scenes),
      updatedAt: new Date().toISOString(),
    },
  }
}

export function parseTimelineProject(raw: unknown): TimelineProject | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== TIMELINE_VERSION) return null
  if (!Array.isArray(o.scenes)) return null
  const resolution = o.resolution as TimelineResolution | undefined
  if (!resolution?.width || !resolution?.height) return null

  const scenes = (o.scenes as TimelineSceneClip[]).filter((s) => s?.id)
  if (scenes.length < 1) return null

  return {
    version: TIMELINE_VERSION,
    projectId: typeof o.projectId === 'string' ? o.projectId : null,
    title: typeof o.title === 'string' ? o.title : 'Untitled',
    fps: typeof o.fps === 'number' ? o.fps : REEL_FPS,
    resolution,
    scenes,
    audioTracks: Array.isArray(o.audioTracks)
      ? (o.audioTracks as TimelineAudioClip[])
      : [],
    captionTracks: Array.isArray(o.captionTracks)
      ? (o.captionTracks as TimelineCaptionClip[])
      : [],
    sceneMotion: (o.sceneMotion as SceneMotionMap) ?? undefined,
    totalDurationSec:
      typeof o.totalDurationSec === 'number'
        ? o.totalDurationSec
        : computeTotalDurationSec(scenes),
    updatedAt:
      typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
  }
}

export function timelineJsonFromProject(
  project: TimelineProject | null
): Record<string, unknown> | null {
  if (!project) return null
  return project as unknown as Record<string, unknown>
}
