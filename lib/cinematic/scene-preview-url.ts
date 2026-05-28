import type { GeneratedScene } from '@/lib/cinematic/generation'

/** Curated vertical cinematic stills — index chosen from scene prompt + position. */
const PLACEHOLDER_POOL = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&h=1920&fit=crop&q=85&auto=format',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1920&fit=crop&q=85&auto=format',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&h=1920&fit=crop&q=85&auto=format',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&h=1920&fit=crop&q=85&auto=format',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&h=1920&fit=crop&q=85&auto=format',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&h=1920&fit=crop&q=85&auto=format',
  'https://images.unsplash.com/photo-1419242909814-28b258469838?w=1080&h=1920&fit=crop&q=85&auto=format',
  'https://images.unsplash.com/photo-1501785888041-af3ef185b470?w=1080&h=1920&fit=crop&q=85&auto=format',
]

function hashPlaceholderIndex(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % PLACEHOLDER_POOL.length
}

/** Stable, visually distinct placeholder when a scene image is missing or failed. */
export function placeholderSceneImageUrl(scene: GeneratedScene, index: number): string {
  const key = (
    scene.imagePrompt ||
    scene.visualPrompt ||
    scene.title ||
    scene.description ||
    `scene-${index}`
  ).trim()
  return PLACEHOLDER_POOL[hashPlaceholderIndex(`${index}:${key}`)]
}

/** Best URL for Ken Burns / storyboard preview — never returns empty. */
export function resolveScenePreviewUrl(scene: GeneratedScene, index: number): string {
  const url = scene.imageUrl?.trim()
  if (url) return url
  return placeholderSceneImageUrl(scene, index)
}

/** Ensures every scene has a non-empty preview URL (Ken Burns / legacy hydration). */
export function ensureScenesHavePreviewUrls(scenes: GeneratedScene[]): GeneratedScene[] {
  return scenes.map((scene, index) => {
    const url = scene.imageUrl?.trim()
    if (url) return { ...scene, imageUrl: url }
    return { ...scene, imageUrl: placeholderSceneImageUrl(scene, index) }
  })
}
