import type { GeneratedScene } from '@/lib/cinematic/generation'

export function parseProjectScenes(raw: unknown): GeneratedScene[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((s) => s && typeof s === 'object') as GeneratedScene[]
}

/** Resolve storyboard still URL by scene id (UUID) or 1-based scene index string. */
export function resolveSceneImageUrl(
  scenes: GeneratedScene[],
  sceneId: string
): string | null {
  const trimmed = sceneId.trim()
  if (!trimmed) return null

  const byId = scenes.find((s) => s.id === trimmed)
  if (byId?.imageUrl?.trim()) return byId.imageUrl.trim()
  if (byId?.variationImageUrl?.trim()) return byId.variationImageUrl.trim()

  const index = Number.parseInt(trimmed, 10)
  if (Number.isFinite(index) && index > 0) {
    const byIndex = scenes[index - 1]
    if (byIndex?.imageUrl?.trim()) return byIndex.imageUrl.trim()
    if (byIndex?.variationImageUrl?.trim()) return byIndex.variationImageUrl.trim()
    const match = scenes.find((s) => {
      const title = s.title?.toLowerCase() ?? ''
      return title.includes(`scene ${index}`) || title === `scene ${index}`
    })
    if (match?.imageUrl?.trim()) return match.imageUrl.trim()
  }

  const withImage = scenes.find((s) => s.imageUrl?.trim())
  return withImage?.imageUrl?.trim() ?? null
}
