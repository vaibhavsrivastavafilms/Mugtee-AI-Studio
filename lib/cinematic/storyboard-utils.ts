import { v4 as uuidv4 } from 'uuid'
import type { CinematicScene, StoryboardImage } from '@/stores/cinematic-project'

export function normalizeStoryboardImages(raw: unknown): StoryboardImage[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const url = typeof row.url === 'string' ? row.url.trim() : ''
      const assetPath =
        typeof row.assetPath === 'string' && row.assetPath.trim()
          ? row.assetPath.trim()
          : undefined
      const variantLabel =
        typeof row.variantLabel === 'string' ? row.variantLabel.trim() : 'Frame'
      const id =
        typeof row.id === 'string' && row.id.trim() ? row.id.trim() : uuidv4()
      if (!url && !assetPath) return null
      return { id, url: url || '', variantLabel, ...(assetPath ? { assetPath } : {}) }
    })
    .filter(Boolean) as StoryboardImage[]
}

export function getActiveStoryboardImage(
  scene: Pick<CinematicScene, 'storyboardImages' | 'activeStoryboardId' | 'imageUrl'>
): StoryboardImage | null {
  const images = scene.storyboardImages ?? []
  if (images.length === 0) {
    if (scene.imageUrl) {
      return { id: 'legacy', url: scene.imageUrl, variantLabel: 'Primary frame' }
    }
    return null
  }

  const active = images.find((img) => img.id === scene.activeStoryboardId)
  return active ?? images[0] ?? null
}

export function applyStoryboardToScene(
  scene: CinematicScene,
  images: StoryboardImage[],
  activeStoryboardId?: string
): CinematicScene {
  const activeId = activeStoryboardId || images[0]?.id
  const active = images.find((img) => img.id === activeId) ?? images[0]
  return {
    ...scene,
    storyboardImages: images,
    activeStoryboardId: active?.id,
    imageUrl: active?.url ?? scene.imageUrl,
    imageAssetPath: active?.assetPath ?? scene.imageAssetPath,
  }
}

export function selectStoryboardVariant(
  scene: CinematicScene,
  imageId: string
): CinematicScene {
  const images = scene.storyboardImages ?? []
  const selected = images.find((img) => img.id === imageId)
  if (!selected) return scene
  return {
    ...scene,
    activeStoryboardId: selected.id,
    imageUrl: selected.url,
    imageAssetPath: selected.assetPath ?? scene.imageAssetPath,
  }
}

export function sceneNeedsStoryboard(scene: CinematicScene): boolean {
  return !scene.storyboardImages || scene.storyboardImages.length === 0
}
