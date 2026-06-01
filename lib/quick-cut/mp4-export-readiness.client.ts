import { isQuickCutMp4DownloadReady } from '@/lib/quick-cut/asset-availability'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export type Mp4ExportUiState = {
  canCompileMp4: boolean
  mp4DownloadReady: boolean
  mp4Compiling: boolean
  /** Matches download button enabled (file verified or package-only export). */
  exportReadyBadge: boolean
  /** User can open the MP4 row / primary export action. */
  hasMp4Action: boolean
  mp4ButtonEnabled: boolean
}

export function resolveMp4ExportUiState(input: {
  scenes: GeneratedScene[]
  voiceUrl: string | null
  videoUrl: string | null
  videoRenderEnabled: boolean
  exportExpired?: boolean
  exportPackageReady?: boolean
  isRenderingVideo?: boolean
  renderPollUrl?: string | null
  renderError?: string | null
  downloadValidated?: boolean
  reelValidating?: boolean
  downloadingMp4?: boolean
}): Mp4ExportUiState {
  const canCompileMp4 = quickCutCanCompileMp4(
    input.scenes,
    input.voiceUrl,
    input.videoRenderEnabled
  )
  const mp4DownloadReady = isQuickCutMp4DownloadReady({
    videoUrl: input.videoUrl,
    videoRenderEnabled: input.videoRenderEnabled,
    exportExpired: input.exportExpired,
    isRenderingVideo: input.isRenderingVideo,
    renderPollUrl: input.renderPollUrl,
    renderError: input.renderError,
    downloadValidated: input.downloadValidated,
  })
  const mp4Compiling = Boolean(
    input.isRenderingVideo ||
      (input.videoRenderEnabled &&
        input.renderPollUrl &&
        !input.videoUrl?.trim() &&
        !input.renderError?.trim())
  )
  const packageExportReady = !input.videoRenderEnabled && Boolean(input.exportPackageReady)
  const exportReadyBadge = mp4DownloadReady || packageExportReady
  const hasMp4Action =
    mp4DownloadReady ||
    packageExportReady ||
    (canCompileMp4 && !input.exportExpired && !input.reelValidating)
  const mp4ButtonEnabled =
    hasMp4Action &&
    !input.downloadingMp4 &&
    !mp4Compiling &&
    !input.exportExpired &&
    !input.reelValidating

  return {
    canCompileMp4,
    mp4DownloadReady,
    mp4Compiling,
    exportReadyBadge,
    hasMp4Action,
    mp4ButtonEnabled,
  }
}
