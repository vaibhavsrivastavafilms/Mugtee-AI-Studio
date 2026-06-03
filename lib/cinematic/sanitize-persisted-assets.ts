import type { CinematicScene, CinematicVoice } from '@/stores/cinematic-project'
import { normalizeStoryboardImages } from '@/lib/cinematic/storyboard-utils'
import { refreshAllSceneStoryboardUrlsClient } from '@/lib/storyboard/storyboard-url-service.client'
import { extractStoragePathFromUrl } from '@/lib/storyboard/storyboard-asset'

/** Drop empty or clearly invalid persisted media URLs (prevents dead network requests). */
export function sanitizeAssetUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  if (trimmed === 'undefined' || trimmed === 'null') return undefined
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }
  return undefined
}

export function sanitizeScenesFromPersistence(scenes: CinematicScene[]): CinematicScene[] {
  if (!Array.isArray(scenes)) return []
  const sanitized = scenes.map((scene) => {
    const storyboardImages = normalizeStoryboardImages(scene.storyboardImages)
    const imageUrl = sanitizeAssetUrl(scene.imageUrl)
    const imageAssetPath =
      typeof scene.imageAssetPath === 'string' && scene.imageAssetPath.trim()
        ? scene.imageAssetPath.trim()
        : extractStoragePathFromUrl(imageUrl) ?? undefined
    const activeId = scene.activeStoryboardId
    const active =
      storyboardImages.find((img) => img.id === activeId) ?? storyboardImages[0]
    return {
      ...scene,
      storyboardImages,
      activeStoryboardId: active?.id,
      imageUrl: active?.url ?? imageUrl,
      ...(imageAssetPath ? { imageAssetPath } : {}),
    }
  })
  return refreshAllSceneStoryboardUrlsClient(sanitized)
}

export function sanitizeVoiceFromPersistence(
  voice: CinematicVoice | null | undefined
): CinematicVoice | null {
  if (!voice) return null
  const audioUrl = sanitizeAssetUrl(voice.audioUrl)
  if (!audioUrl && !voice.narration?.trim()) return null
  return { ...voice, audioUrl }
}
