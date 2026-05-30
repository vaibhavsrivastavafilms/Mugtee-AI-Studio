import type { GeneratedScene } from '@/lib/cinematic/generation'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

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
}): boolean {
  if (input.exportExpired) return false
  if (input.isRenderingVideo || input.renderPollUrl) return false
  const url = input.videoUrl?.trim()
  if (!url) return false
  if (input.videoRenderEnabled && input.renderError?.trim()) return false
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
  if (isGenerating || scenes.length < 1) return false
  return scenes.some((scene) => isRealSceneImageUrl(scene.imageUrl))
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
      analyzing: 'Reading your brief…',
      title: 'Generating viral title…',
      hook: 'Crafting hook…',
      script: 'Writing cinematic script…',
      scenes: 'Building emotional pacing…',
      images: 'Generating cinematic visuals…',
      voice: 'Synthesizing voiceover…',
      render: 'Packaging storyboard export…',
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
    if (renderError) return renderError
    if (isRenderingVideo || renderPollUrl) {
      return renderStatusLabel || 'Rendering reel…'
    }
    if (hasImages && hasNarration) return 'Compile MP4 to finish export'
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
export async function fetchProjectReelDownload(
  projectId: string
): Promise<ProjectReelDownloadStatus> {
  const res = await fetch(`/api/reels/download/${encodeURIComponent(projectId)}`, {
    credentials: 'include',
  })
  if (!res.ok) {
    return { reelUrl: null, status: 'failed' }
  }
  const data = (await res.json()) as { reelUrl?: string | null; status?: string }
  const reelUrl = typeof data.reelUrl === 'string' && data.reelUrl.trim() ? data.reelUrl.trim() : null
  return { reelUrl, status: typeof data.status === 'string' ? data.status : 'pending' }
}
