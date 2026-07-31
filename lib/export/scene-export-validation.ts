import type { GeneratedScene } from '@/lib/cinematic/generation'
import { extractStoragePathFromUrl } from '@/lib/storyboard/storyboard-asset'

/** Scene still used for reel MP4 export (primary imageUrl or storyboard fallback). */
export type SceneExportImageSource = {
  id: string
  title?: string | null
  imageUrl?: string | null
  imageAssetPath?: string | null
  activeStoryboardId?: string | null
  storyboardImages?: { id: string; url?: string | null; assetPath?: string | null }[] | null
}

export type MissingExportScene = {
  index: number
  id: string
  title: string
}

export function resolveSceneExportAssetPath(scene: SceneExportImageSource): string | null {
  if (scene.imageAssetPath?.trim()) return scene.imageAssetPath.trim()
  const storyboard = scene.storyboardImages ?? []
  const active = storyboard.find((img) => img.id === scene.activeStoryboardId)
  if (active?.assetPath?.trim()) return active.assetPath.trim()
  const firstPath = storyboard[0]?.assetPath
  if (firstPath?.trim()) return firstPath.trim()
  const fromImageUrl = extractStoragePathFromUrl(scene.imageUrl)
  if (fromImageUrl) return fromImageUrl
  const fromActiveUrl = extractStoragePathFromUrl(active?.url)
  if (fromActiveUrl) return fromActiveUrl
  const fromFirstUrl = extractStoragePathFromUrl(storyboard[0]?.url)
  return fromFirstUrl ?? null
}

export function resolveSceneExportImageUrl(scene: SceneExportImageSource): string | null {
  if (scene.imageUrl?.trim()) return scene.imageUrl.trim()
  const active = scene.storyboardImages?.find(
    (img) => img.id === scene.activeStoryboardId
  )?.url
  if (active?.trim()) return active.trim()
  const first = scene.storyboardImages?.[0]?.url
  return first?.trim() ? first.trim() : null
}

/** Ephemeral / placeholder URLs that must not count as export-ready stills. */
export function isEphemeralExportImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  const lower = url.trim().toLowerCase()
  return (
    lower.includes('pollinations.ai') ||
    lower.includes('image.pollinations') ||
    lower.includes('images.unsplash.com') ||
    lower.includes('placehold.co') ||
    lower.includes('via.placeholder') ||
    lower.startsWith('data:image/svg')
  )
}

export function isDurableExportImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  if (isEphemeralExportImageUrl(url)) return false
  if (extractStoragePathFromUrl(url)) return true
  if (url.startsWith('data:image/') && !url.startsWith('data:image/svg')) return true
  // Same-origin / Supabase signed URLs only
  if (lowerIsSupabaseOrLocal(url)) return true
  return false
}

function lowerIsSupabaseOrLocal(url: string): boolean {
  const lower = url.trim().toLowerCase()
  return (
    lower.includes('supabase.co') ||
    lower.includes('/storage/v1/object/') ||
    lower.startsWith('/') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1')
  )
}

export function sceneHasExportableStoryboard(scene: SceneExportImageSource): boolean {
  const assetPath = resolveSceneExportAssetPath(scene)
  if (assetPath) return true
  const url = resolveSceneExportImageUrl(scene)
  return isDurableExportImageUrl(url)
}

export function findScenesMissingExportImages(
  scenes: SceneExportImageSource[]
): MissingExportScene[] {
  return scenes
    .map((scene, index) => ({
      scene,
      index: index + 1,
      id: scene.id,
      title: scene.title?.trim() || `Scene ${index + 1}`,
    }))
    .filter(({ scene }) => !sceneHasExportableStoryboard(scene))
    .map(({ index, id, title }) => ({ index, id, title }))
}

export function allScenesHaveExportImages(scenes: SceneExportImageSource[]): boolean {
  if (scenes.length < 1) return false
  return findScenesMissingExportImages(scenes).length === 0
}

function formatSceneNumberList(indices: number[]): string {
  if (indices.length === 1) return String(indices[0])
  if (indices.length === 2) return `${indices[0]} and ${indices[1]}`
  return `${indices.slice(0, -1).join(', ')}, and ${indices[indices.length - 1]}`
}

/** Creator-facing copy when export is blocked by missing storyboard stills. */
export function missingScenesExportMessage(missing: MissingExportScene[]): string {
  if (missing.length < 1) return ''
  const nums = missing.map((m) => m.index)
  const sceneWord = nums.length === 1 ? 'Scene' : 'Scenes'
  const imageWord = nums.length === 1 ? 'image' : 'images'
  return `Cannot export reel — ${sceneWord.toLowerCase()} ${formatSceneNumberList(nums)} ${nums.length === 1 ? 'is' : 'are'} missing storyboard ${imageWord}. Regenerate them, then try export again.`
}

export function assertAllScenesHaveExportImages(scenes: SceneExportImageSource[]): void {
  const missing = findScenesMissingExportImages(scenes)
  if (missing.length > 0) {
    throw new Error(missingScenesExportMessage(missing))
  }
}

export function sceneExportReadiness(scenes: GeneratedScene[] | SceneExportImageSource[]): {
  ready: boolean
  missing: MissingExportScene[]
  message: string | null
} {
  const missing = findScenesMissingExportImages(scenes)
  return {
    ready: missing.length === 0 && scenes.length > 0,
    missing,
    message: missing.length > 0 ? missingScenesExportMessage(missing) : null,
  }
}

/** @deprecated Voice is soft-optional — kept for older error string matches. */
export const VOICE_REQUIRED_EXPORT_MSG = 'Add voiceover before exporting.'

/**
 * Pre-export gate: every scene needs a still.
 * Voice is soft-optional (Production OS) — continue without narration.
 */
export function reelExportReadiness(
  scenes: GeneratedScene[] | SceneExportImageSource[],
  _voiceUrl?: string | null | undefined
): {
  ready: boolean
  missing: MissingExportScene[]
  message: string | null
} {
  if (scenes.length < 1) {
    return {
      ready: false,
      missing: [],
      message: 'At least one storyboard scene is required.',
    }
  }
  const sceneCheck = sceneExportReadiness(scenes)
  if (!sceneCheck.ready) {
    return sceneCheck
  }
  return { ready: true, missing: [], message: null }
}

export function isMissingScenesExportError(message: string | null | undefined): boolean {
  return Boolean(message?.trim().startsWith('Cannot export reel —'))
}
