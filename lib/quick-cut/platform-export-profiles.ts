import type { GeneratedScene } from '@/lib/cinematic/generation'
import { NICHE_PROFILES, type CinematicNiche } from '@/lib/cinematic/niches'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import {
  hasExportableSceneImages,
  hasExportableScript,
  isQuickCutMp4DownloadReady,
  isRealSceneImageUrl,
} from '@/lib/quick-cut/asset-availability'
import { buildQuickCutScriptText } from '@/lib/quick-cut/download-script'
import type { DeepResearchReport } from '@/types/deep-research'

export type PlatformAssetState = 'ready' | 'missing' | 'preparing'

export type PlatformExportId = 'youtube' | 'instagram' | 'tiktok'

export type PlatformAssetSpec = {
  filename: string
  label: string
}

export type PlatformProfile = {
  id: PlatformExportId
  name: string
  zipSuffix: string
  assets: PlatformAssetSpec[]
}

export type PlatformExportInput = {
  title: string
  hook: string
  script: string
  scriptBeats?: { narration: string; duration: string; emotion: string }[]
  payoff?: string
  cta?: string
  prompt: string
  niche: CinematicNiche
  scenes: GeneratedScene[]
  voiceUrl: string | null
  videoUrl: string | null
  videoRenderEnabled: boolean
  exportExpired?: boolean
  isRenderingVideo?: boolean
  renderPollUrl?: string | null
  renderError?: string | null
  researchReport?: DeepResearchReport | null
  savedProjectId?: string | null
  isUnlimited?: boolean
  isGenerating?: boolean
  /** Set when reel download API confirms file exists (see useReelDownloadReadiness). */
  downloadValidated?: boolean
  /** True while reel URL is being verified on the server. */
  videoValidating?: boolean
  /** Precomputed compile eligibility — mirrors download panel MP4 row. */
  mp4CanCompile?: boolean
  /** Derived thumbnail concept when no scene still is exportable yet. */
  thumbnailConcept?: string
  /** Dedicated cover image URL (persisted thumbnail_url). */
  thumbnailImageUrl?: string | null
}

export type PlatformAssetStatus = {
  filename: string
  label: string
  available: boolean
  state: PlatformAssetState
}

export const PLATFORM_PROFILES: Record<PlatformExportId, PlatformProfile> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    zipSuffix: 'youtube-package',
    assets: [
      { filename: 'title.txt', label: 'Title' },
      { filename: 'description.txt', label: 'Description' },
      { filename: 'tags.txt', label: 'Tags' },
      { filename: 'thumbnail.jpg', label: 'Thumbnail' },
      { filename: 'script.txt', label: 'Script' },
      { filename: 'video.mp4', label: 'Video' },
    ],
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    zipSuffix: 'instagram-package',
    assets: [
      { filename: 'caption.txt', label: 'Caption' },
      { filename: 'hashtags.txt', label: 'Hashtags' },
      { filename: 'cover-title.txt', label: 'Cover title' },
      { filename: 'reel-video.mp4', label: 'Reel video' },
    ],
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    zipSuffix: 'tiktok-package',
    assets: [
      { filename: 'hook.txt', label: 'Hook' },
      { filename: 'caption.txt', label: 'Caption' },
      { filename: 'video.mp4', label: 'Video' },
    ],
  },
}

export const PLATFORM_EXPORT_IDS: PlatformExportId[] = ['youtube', 'instagram', 'tiktok']

function extractScriptExcerpt(input: PlatformExportInput, maxLen: number): string {
  if (input.scriptBeats?.length) {
    return input.scriptBeats
      .map((beat) => beat.narration?.trim())
      .filter(Boolean)
      .join(' ')
      .slice(0, maxLen)
  }
  const script = input.script.trim()
  if (script) return script.slice(0, maxLen)
  return input.hook.trim().slice(0, maxLen)
}

function hasGeneratedText(input: PlatformExportInput): boolean {
  return Boolean(
    input.title.trim() ||
      input.hook.trim() ||
      input.script.trim() ||
      input.prompt.trim() ||
      input.scriptBeats?.some((beat) => beat.narration?.trim())
  )
}

function resolveSceneThumbnailUrl(scene: GeneratedScene, index: number): string | null {
  if (isRealSceneImageUrl(scene.imageUrl)) return scene.imageUrl!.trim()
  const storyboardUrl = scene.storyboardImages
    ?.map((img) => img.url?.trim())
    .find((url) => isRealSceneImageUrl(url))
  if (storyboardUrl) return storyboardUrl
  const preview = resolveScenePreviewUrl(scene, index)
  return isRealSceneImageUrl(preview) ? preview : null
}

export function hasExportableThumbnailImage(
  scenes: GeneratedScene[],
  isGenerating = false
): boolean {
  return hasExportableSceneImages(scenes, isGenerating)
}

export function hasExportableThumbnail(
  scenes: GeneratedScene[],
  isGenerating = false,
  thumbnailConcept?: string
): boolean {
  if (hasExportableThumbnailImage(scenes, isGenerating)) return true
  return Boolean(thumbnailConcept?.trim())
}

export function resolveThumbnailSceneIndex(scenes: GeneratedScene[]): number {
  const realIndex = scenes.findIndex(
    (scene) =>
      isRealSceneImageUrl(scene.imageUrl) ||
      scene.storyboardImages?.some((img) => isRealSceneImageUrl(img.url))
  )
  return realIndex >= 0 ? realIndex : 0
}

export function resolveThumbnailImageUrl(
  scenes: GeneratedScene[],
  isGenerating = false,
  thumbnailImageUrl?: string | null
): string | null {
  if (isRealSceneImageUrl(thumbnailImageUrl)) return thumbnailImageUrl!.trim()
  if (!hasExportableThumbnailImage(scenes, isGenerating)) return null
  const index = resolveThumbnailSceneIndex(scenes)
  const scene = scenes[index]
  if (!scene) return null
  return resolveSceneThumbnailUrl(scene, index)
}

export function resolvePlatformVideoAssetState(input: PlatformExportInput): PlatformAssetState {
  if (input.exportExpired) return 'missing'
  if (input.isRenderingVideo || input.renderPollUrl || input.videoValidating) {
    return 'preparing'
  }

  const mp4DownloadReady = isQuickCutMp4DownloadReady({
    videoUrl: input.videoUrl,
    videoRenderEnabled: input.videoRenderEnabled,
    exportExpired: input.exportExpired,
    isRenderingVideo: input.isRenderingVideo,
    renderPollUrl: input.renderPollUrl,
    renderError: input.renderError,
    downloadValidated: input.downloadValidated,
  })
  if (mp4DownloadReady) return 'ready'

  const url = input.videoUrl?.trim()
  if (url && isValidReelDownloadUrl(url)) return 'preparing'

  return 'missing'
}

export function hasExportablePlatformVideo(input: PlatformExportInput): boolean {
  return resolvePlatformVideoAssetState(input) === 'ready'
}

function resolveThumbnailAssetState(input: PlatformExportInput): PlatformAssetState {
  if (
    isRealSceneImageUrl(input.thumbnailImageUrl) ||
    hasExportableThumbnailImage(input.scenes, input.isGenerating)
  ) {
    return 'ready'
  }
  if (input.thumbnailConcept?.trim()) return 'ready'
  return 'missing'
}

function resolveTextAssetState(available: boolean): PlatformAssetState {
  return available ? 'ready' : 'missing'
}

function resolveAssetState(
  profileId: PlatformExportId,
  filename: string,
  input: PlatformExportInput
): PlatformAssetState {
  switch (filename) {
    case 'title.txt':
      return resolveTextAssetState(Boolean(input.title.trim()))
    case 'description.txt':
    case 'tags.txt':
    case 'hashtags.txt':
      return resolveTextAssetState(hasGeneratedText(input))
    case 'thumbnail.jpg':
      return resolveThumbnailAssetState(input)
    case 'script.txt':
      return resolveTextAssetState(hasExportableScript(input))
    case 'video.mp4':
    case 'reel-video.mp4':
      return resolvePlatformVideoAssetState(input)
    case 'caption.txt':
      return resolveTextAssetState(
        Boolean(input.hook.trim() || input.script.trim() || input.scriptBeats?.length)
      )
    case 'cover-title.txt':
      return resolveTextAssetState(Boolean(input.title.trim() || input.hook.trim()))
    case 'hook.txt':
      return resolveTextAssetState(
        Boolean(input.hook.trim() || input.title.trim() || input.script.trim())
      )
    default:
      return 'missing'
  }
}

export function resolvePlatformAssetStatuses(
  profileId: PlatformExportId,
  input: PlatformExportInput
): PlatformAssetStatus[] {
  const profile = PLATFORM_PROFILES[profileId]
  return profile.assets.map((asset) => {
    const state = resolveAssetState(profileId, asset.filename, input)
    return {
      filename: asset.filename,
      label: asset.label,
      available: state === 'ready',
      state,
    }
  })
}

/** True when at least one asset in the profile is ready for ZIP export. */
export function platformProfileCanExport(
  profileId: PlatformExportId,
  input: PlatformExportInput
): boolean {
  return resolvePlatformAssetStatuses(profileId, input).some((asset) => asset.state === 'ready')
}

export function buildYouTubeDescription(input: PlatformExportInput): string {
  const parts: string[] = []
  if (input.hook.trim()) parts.push(input.hook.trim())

  if (input.script.trim()) {
    parts.push('', input.script.trim().slice(0, 500))
  } else if (input.scriptBeats?.length) {
    parts.push(
      '',
      input.scriptBeats
        .map((beat) => beat.narration?.trim())
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 500)
    )
  }

  if (input.payoff?.trim()) parts.push('', input.payoff.trim())
  if (input.cta?.trim()) parts.push('', input.cta.trim())

  const body = parts.join('\n').trim()
  if (body) return body
  return input.prompt.trim() || input.title.trim() || 'Description pending — add script content.'
}

export function buildYouTubeTags(input: PlatformExportInput): string {
  const tags = new Set<string>()
  const nicheProfile = NICHE_PROFILES[input.niche]

  if (nicheProfile) {
    tags.add(nicheProfile.label.toLowerCase())
    nicheProfile.vocabulary.slice(0, 5).forEach((word) => tags.add(word))
  }

  const source = `${input.title} ${input.prompt} ${input.hook}`.toLowerCase()
  const words = source.match(/\b[a-z]{4,}\b/g) ?? []
  words.slice(0, 8).forEach((word) => tags.add(word))

  tags.add('shorts')
  tags.add('reels')

  return [...tags].slice(0, 15).join(', ')
}

export function buildInstagramCaption(input: PlatformExportInput): string {
  const lines: string[] = []
  if (input.hook.trim()) lines.push(input.hook.trim())

  const excerpt = extractScriptExcerpt(input, 300)
  if (excerpt && excerpt !== input.hook.trim()) {
    lines.push('', excerpt)
  }

  if (input.cta?.trim()) lines.push('', input.cta.trim())
  return lines.join('\n').trim() || input.title.trim() || input.prompt.trim()
}

export function buildInstagramHashtags(input: PlatformExportInput): string {
  const tags: string[] = []
  const nicheProfile = NICHE_PROFILES[input.niche]

  if (nicheProfile) {
    tags.push(`#${nicheProfile.label.replace(/\s+/g, '').toLowerCase()}`)
    nicheProfile.vocabulary.slice(0, 4).forEach((word) => {
      tags.push(`#${word.replace(/\s+/g, '')}`)
    })
  }

  tags.push('#reels', '#cinematic', '#storytelling', '#faceless')

  return [...new Set(tags)].slice(0, 20).join(' ')
}

export function buildInstagramCoverTitle(input: PlatformExportInput): string {
  return input.title.trim() || input.hook.trim() || 'Untitled reel'
}

export function buildTikTokHook(input: PlatformExportInput): string {
  return input.hook.trim() || input.title.trim() || extractScriptExcerpt(input, 120)
}

export function buildTikTokCaption(input: PlatformExportInput): string {
  const hook = buildTikTokHook(input)
  const excerpt = extractScriptExcerpt(input, 150)
  if (excerpt && excerpt !== hook) {
    return `${hook}\n\n${excerpt}`
  }
  return hook
}

export function buildPlatformScriptText(input: PlatformExportInput): string {
  return buildQuickCutScriptText({
    title: input.title,
    hook: input.hook,
    script: input.script,
    scriptBeats: input.scriptBeats,
    payoff: input.payoff,
    cta: input.cta,
    isUnlimited: input.isUnlimited,
  })
}

export function platformHasAnyExportableAsset(input: PlatformExportInput): boolean {
  return PLATFORM_EXPORT_IDS.some((profileId) => platformProfileCanExport(profileId, input))
}
