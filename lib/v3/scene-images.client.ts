import type { V3SceneImageRow } from '@/types/v3/production'

/** Client-safe helper mirroring server pickLatestSceneImages. */
export function pickLatestSceneImages(images: V3SceneImageRow[]): V3SceneImageRow[] {
  const latest = new Map<string, V3SceneImageRow>()
  for (const image of images) {
    const existing = latest.get(image.scene_id)
    if (!existing) {
      latest.set(image.scene_id, image)
      continue
    }
    if (image.status === 'completed' && existing.status !== 'completed') {
      latest.set(image.scene_id, image)
      continue
    }
    if (image.created_at > existing.created_at && image.status === 'completed') {
      latest.set(image.scene_id, image)
    }
  }
  return Array.from(latest.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}
