import type { GeneratedScene } from '@/lib/cinematic/generation'
import { placeholderSceneImageUrl } from '@/lib/cinematic/scene-preview-url'
import type { CinematicScene } from '@/stores/cinematic-project'
import type { ReelTimeline, ReelTimelineClip } from '@/lib/reel/types'

export const DEFAULT_SCENE_PROMPT = 'Cinematic storyboard frame'
export const DEFAULT_SCENE_TITLE = 'Scene'

export function fallbackScenePrompt(
  scene: Pick<CinematicScene, 'imagePrompt' | 'visualPrompt' | 'title'>,
  index: number
): string {
  return (
    scene.imagePrompt?.trim() ||
    scene.visualPrompt?.trim() ||
    scene.title?.trim() ||
    `${DEFAULT_SCENE_TITLE} ${index + 1}`
  )
}

export function fallbackSceneTitle(scene: Pick<CinematicScene, 'title'>, index: number): string {
  return scene.title?.trim() || `${DEFAULT_SCENE_TITLE} ${index + 1}`
}

function minimalGeneratedScene(scene: CinematicScene, index: number): GeneratedScene {
  const prompt = fallbackScenePrompt(scene, index)
  const title = fallbackSceneTitle(scene, index)
  return {
    id: scene.id || `scene-${index + 1}`,
    title,
    description: scene.narration?.trim() || prompt,
    duration: scene.duration ?? 4,
    visualPrompt: scene.visualPrompt?.trim() || prompt,
    imagePrompt: prompt,
    cameraAngle: scene.cameraAngle?.trim() || '',
    lightingMood: scene.lightingMood?.trim() || '',
    environment: scene.environment?.trim() || '',
    colorPalette: scene.colorPalette?.trim() || '',
    movementStyle: scene.movementStyle?.trim() || '',
    imageUrl: scene.imageUrl,
  }
}

/** Default vertical placeholder used when a storyboard still is missing. */
export const DEFAULT_PLACEHOLDER_IMAGE = placeholderSceneImageUrl(
  minimalGeneratedScene({ id: 'fallback', index: 0, title: 'Mugtee export placeholder' }, 0),
  0
)

/** Attach a stable placeholder image URL to a scene missing export stills. */
export function attachFallbackImage(scene: CinematicScene, index: number): CinematicScene {
  const imageUrl =
    scene.imageUrl?.trim() || placeholderSceneImageUrl(minimalGeneratedScene(scene, index), index)
  return {
    ...scene,
    imageUrl,
    title: fallbackSceneTitle(scene, index),
    imagePrompt: fallbackScenePrompt(scene, index),
  }
}

/** Create a minimal storyboard entry when scene has no images at all. */
export function createPlaceholderStoryboard(scene: CinematicScene, index: number): CinematicScene {
  const imageUrl = placeholderSceneImageUrl(minimalGeneratedScene(scene, index), index)
  const id = scene.id || `scene-${index + 1}`
  const placeholderId = `placeholder-${id}`
  return {
    ...scene,
    id,
    imageUrl,
    title: fallbackSceneTitle(scene, index),
    imagePrompt: fallbackScenePrompt(scene, index),
    storyboardImages: scene.storyboardImages?.length
      ? scene.storyboardImages
      : [{ id: placeholderId, url: imageUrl, variantLabel: 'Placeholder', assetPath: undefined }],
    activeStoryboardId: scene.activeStoryboardId ?? placeholderId,
  }
}

/** Ensure every scene has a non-empty imageUrl for export compilers. */
export function ensureExportSafeScenes(scenes: CinematicScene[]): CinematicScene[] {
  return scenes.map((scene, index) => {
    const hasImage =
      Boolean(scene.imageUrl?.trim()) ||
      Boolean(scene.imageAssetPath?.trim()) ||
      Boolean(scene.storyboardImages?.some((img) => img.url?.trim() || img.assetPath?.trim()))
    if (hasImage) {
      return {
        ...scene,
        title: fallbackSceneTitle(scene, index),
        imagePrompt: fallbackScenePrompt(scene, index),
      }
    }
    return createPlaceholderStoryboard(scene, index)
  })
}

/** Ensure timeline clips always reference an image URL for browser compile. */
export function ensureExportSafeTimeline(timeline: ReelTimeline): ReelTimeline {
  const clips: ReelTimelineClip[] = timeline.clips.map((clip, index) => ({
    ...clip,
    sceneId: clip.sceneId || `scene-${index + 1}`,
    title: clip.title?.trim() || `${DEFAULT_SCENE_TITLE} ${index + 1}`,
    image: clip.image?.trim() || clip.video?.trim() || DEFAULT_PLACEHOLDER_IMAGE,
    caption: clip.caption
      ? {
          ...clip.caption,
          text: clip.caption.text?.trim() || clip.title || `${DEFAULT_SCENE_TITLE} ${index + 1}`,
        }
      : clip.caption,
  }))
  return { ...timeline, clips }
}
