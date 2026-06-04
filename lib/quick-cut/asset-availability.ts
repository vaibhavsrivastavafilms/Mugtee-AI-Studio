import type { GeneratedScene } from '@/lib/cinematic/generation'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

import { isSameOriginReelDownloadUrl } from '@/lib/export/reel-same-origin'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'

export const ASSET_UNAVAILABLE_MSG = 'Asset unavailable. Regenerate required.'
export const EXPORT_EXPIRED_MSG = 'Export expired. Regenerate export.'

/** True when MP4 is finished rendering and a download URL is available. */
export function isQuickCutMp4DownloadReady(input: {
  videoUrl: string | null
  videoRenderEnabled: boolean
  exportExpired?: boolean
  isRenderingVideo?: boolean
  renderPollUrl?: string | null
  renderError?: string | null
  /** Set when server/client validation confirms file exists */
  downloadValidated?: boolean
}): boolean {
  if (input.exportExpired) return false
  if (input.isRenderingVideo || input.renderPollUrl) return false
  const url = input.videoUrl?.trim()
  if (!url || !isValidReelDownloadUrl(url)) return false
  if (input.videoRenderEnabled && input.renderError?.trim()) return false
  if (isSameOriginReelDownloadUrl(url)) return true
  if (input.downloadValidated === false) return false
  return true
}

const PLACEHOLDER_HOST = 'images.unsplash.com'

/** True when the URL points at a generated/uploaded still (not a preview placeholder). */
export function isRealSceneImageUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim()
  if (!trimmed) return false
  if (trimmed.includes(PLACEHOLDER_HOST)) return false
  return true
}

export function hasExportableScript(input: {
  title?: string
  hook?: string
  script?: string
  scriptBeats?: { narration: string }[]
}): boolean {
  return Boolean(
    input.script?.trim() ||
      input.hook?.trim() ||
      input.title?.trim() ||
      input.scriptBeats?.some((beat) => beat.narration?.trim())
  )
}

export function hasExportableSceneImages(
  scenes: GeneratedScene[],
  isGenerating = false
): boolean {
  if (scenes.length < 1) return false
  const hasRealImage = scenes.some(
    (scene) =>
      isRealSceneImageUrl(scene.imageUrl) ||
      scene.storyboardImages?.some((img) => isRealSceneImageUrl(img.url))
  )
  if (hasRealImage) return true
  if (isGenerating) return false
  return false
}

export function hasExportableNarration(voiceUrl: string | null | undefined): boolean {
  return Boolean(voiceUrl?.trim())
}

export function hasExportableMp4(input: {
  videoUrl?: string | null
  scenes: GeneratedScene[]
  voiceUrl?: string | null
  videoRenderEnabled: boolean
  canCompile?: boolean
}): boolean {
  if (input.videoUrl?.trim()) return true
  return (
    input.canCompile ??
    quickCutCanCompileMp4(input.scenes, input.voiceUrl ?? null, input.videoRenderEnabled)
  )
}

export type QuickCutExportAssets = {
  script: boolean
  images: boolean
  narration: boolean
  mp4: boolean
}

export function resolveQuickCutExportAssets(input: {
  title: string
  hook: string
  script: string
  scriptBeats?: { narration: string }[]
  scenes: GeneratedScene[]
  voiceUrl: string | null
  videoUrl: string | null
  videoRenderEnabled: boolean
  isGenerating: boolean
}): QuickCutExportAssets {
  return {
    script: hasExportableScript(input),
    images: hasExportableSceneImages(input.scenes, input.isGenerating),
    narration: hasExportableNarration(input.voiceUrl),
    mp4: hasExportableMp4(input),
  }
}

export type QuickCutProgressLabelInput = {
  generationStep: QuickCutGenerationStep
  isComplete: boolean
  videoUrl: string | null
  videoRenderEnabled: boolean
  renderError: string | null
  renderPollUrl: string | null
  isRenderingVideo: boolean
  renderStatusLabel: string | null
  exportPackageReady: boolean
  exportExpired?: boolean
  hasScript: boolean
  hasImages: boolean
  hasNarration: boolean
}

/** Sync footer / progress copy with what is actually downloadable. */
export function resolveQuickCutProgressLabel(input: QuickCutProgressLabelInput): string {
  const {
    generationStep,
    isComplete,
    videoUrl,
    videoRenderEnabled,
    renderError,
    renderPollUrl,
    isRenderingVideo,
    renderStatusLabel,
    exportPackageReady,
    exportExpired,
    hasScript,
    hasImages,
    hasNarration,
  } = input

  if (generationStep === 'error') return 'Generation paused'
  if (!isComplete) {
    const labels: Partial<Record<QuickCutGenerationStep, string>> = {
      analyzing: 'Mugtee is reading your audience brief…',
      title: 'Mugtee is discovering your story angle…',
      hook: 'Mugtee is crafting your scroll-stopping hook…',
      script: 'Mugtee is directing your next viral story.',
      scenes: 'Mugtee is building your scene breakdown…',
      images: 'Mugtee is generating cinematic visuals…',
      voice: 'Mugtee is creating your voiceover…',
      render: 'Mugtee is rendering your reel…',
    }
    return labels[generationStep] ?? 'In production…'
  }

  if (exportExpired) return EXPORT_EXPIRED_MSG

  if (
    isQuickCutMp4DownloadReady({
      videoUrl,
      videoRenderEnabled,
      exportExpired,
      isRenderingVideo,
      renderPollUrl,
      renderError,
    })
  ) {
    return 'Your cinematic video is ready'
  }

  if (videoRenderEnabled) {
    if (renderError && (isRenderingVideo || renderPollUrl || isComplete)) return renderError
    if (isRenderingVideo || renderPollUrl) {
      return renderStatusLabel || 'Rendering reel…'
    }
    if (hasImages && hasNarration) return 'Export Creator Pack to finish'
    return 'Storyboard export ready'
  }

  if (exportPackageReady) return 'Storyboard export ready'
  if (hasScript || hasImages || hasNarration) return 'Storyboard export ready'
  return 'Production complete'
}

export async function verifyAssetUrlReachable(url: string): Promise<boolean> {
  const trimmed = url.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return true

  try {
    const res = await fetch(trimmed, { method: 'HEAD', mode: 'no-cors' })
    if (res.type === 'opaque') return true
    return res.ok
  } catch {
    try {
      const res = await fetch(trimmed, { method: 'GET', headers: { Range: 'bytes=0-0' } })
      return res.ok || res.status === 206
    } catch {
      return false
    }
  }
}

export type ProjectReelDownloadStatus = {
  reelUrl: string | null
  status: string
}

/** Reads persisted reel URL from the project export API (survives in-memory job expiry). */
export type PublishReadinessInput = {
  title: string
  hook: string
  script: string
  scriptBeats?: { narration: string }[]
  scenes: GeneratedScene[]
  voiceUrl: string | null
  videoUrl: string | null
  videoRenderEnabled: boolean
  isGenerating: boolean
  exportExpired?: boolean
  exportPackageReady?: boolean
  isRenderingVideo?: boolean
  renderPollUrl?: string | null
  renderError?: string | null
}

export type PublishReadiness = {
  project: {
    titleGenerated: boolean
    hookGenerated: boolean
    scriptGenerated: boolean
    storyboardGenerated: boolean
    sceneImagesGenerated: boolean
    voiceGenerated: boolean
    videoRendered: boolean
    creatorPackAvailable: boolean
  }
  platforms: {
    youtube: { titleReady: boolean; thumbnailReady: boolean; videoReady: boolean }
    instagram: { captionReady: boolean; verticalVideoReady: boolean }
    tiktok: { hookReady: boolean; verticalVideoReady: boolean }
  }
  exports: {
    txt: boolean
    docx: boolean
    jpg: boolean
    mp3: boolean
    mp4: boolean
    creatorPack: boolean
  }
  projectReadyForPublishing: boolean
}

export function resolvePublishReadiness(input: PublishReadinessInput): PublishReadiness {
  const titleGenerated = Boolean(input.title?.trim())
  const hookGenerated = Boolean(input.hook?.trim())
  const scriptGenerated = hasExportableScript(input)
  const storyboardGenerated = input.scenes.length > 0
  const sceneImagesGenerated = hasExportableSceneImages(input.scenes, input.isGenerating)
  const voiceGenerated = hasExportableNarration(input.voiceUrl)
  const videoRendered = isQuickCutMp4DownloadReady({
    videoUrl: input.videoUrl,
    videoRenderEnabled: input.videoRenderEnabled,
    exportExpired: input.exportExpired,
    isRenderingVideo: input.isRenderingVideo,
    renderPollUrl: input.renderPollUrl,
    renderError: input.renderError,
  })
  const packageExportReady = Boolean(input.exportPackageReady)
  const mp4ServerDisabled = !input.videoRenderEnabled
  const creatorPackAvailable =
    scriptGenerated && (sceneImagesGenerated || voiceGenerated || titleGenerated)

  const verticalVideoReady =
    videoRendered || (mp4ServerDisabled && packageExportReady && sceneImagesGenerated)
  const captionReady = hookGenerated || scriptGenerated

  const project = {
    titleGenerated,
    hookGenerated,
    scriptGenerated,
    storyboardGenerated,
    sceneImagesGenerated,
    voiceGenerated,
    videoRendered,
    creatorPackAvailable,
  }

  const projectReadyForPublishing = mp4ServerDisabled
    ? Object.entries(project).every(([key, ready]) =>
        key === 'videoRendered' ? ready || packageExportReady : ready
      )
    : Object.values(project).every(Boolean)

  return {
    project,
    platforms: {
      youtube: {
        titleReady: titleGenerated,
        thumbnailReady: sceneImagesGenerated,
        videoReady: verticalVideoReady,
      },
      instagram: {
        captionReady,
        verticalVideoReady,
      },
      tiktok: {
        hookReady: hookGenerated,
        verticalVideoReady,
      },
    },
    exports: {
      txt: scriptGenerated,
      docx: scriptGenerated,
      jpg: sceneImagesGenerated,
      mp3: voiceGenerated,
      mp4: hasExportableMp4(input),
      creatorPack: creatorPackAvailable,
    },
    projectReadyForPublishing,
  }
}

export async function fetchProjectReelDownload(
  projectId: string
): Promise<ProjectReelDownloadStatus> {
  const res = await fetch(`/api/reels/download/${encodeURIComponent(projectId)}`, {
    credentials: 'include',
  })
  if (!res.ok) {
    return { reelUrl: null, status: 'failed' }
  }
  const data = (await res.json()) as {
    reelUrl?: string | null
    status?: string
    validated?: boolean
  }
  const reelUrl =
    typeof data.reelUrl === 'string' &&
    data.reelUrl.trim() &&
    isValidReelDownloadUrl(data.reelUrl)
      ? data.reelUrl.trim()
      : null
  const status =
    data.validated && reelUrl ? 'completed' : typeof data.status === 'string' ? data.status : 'pending'
  return { reelUrl, status }
}
