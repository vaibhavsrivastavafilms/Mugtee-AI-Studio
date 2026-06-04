import { ASSET_UNAVAILABLE_MSG, EXPORT_EXPIRED_MSG } from '@/lib/quick-cut/asset-availability'
import { compileProjectMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import { downloadMp4File } from '@/lib/quick-cut/download-mp4'
import {
  recordDownloadFailure,
  recordDownloadSuccess,
  recordExportFailure,
  recordExportStarted,
  recordExportSuccess,
} from '@/lib/export/export-diagnostics'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'

export function projectMp4FileDownloadPath(projectId: string): string {
  return `/api/reels/download/${encodeURIComponent(projectId)}/file`
}

async function downloadViaProjectFileEndpoint(
  projectId: string,
  filename: string
): Promise<boolean> {
  const res = await fetch(projectMp4FileDownloadPath(projectId), {
    credentials: 'include',
  })
  if (res.status === 404) return false
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Download failed (${res.status})`)
  }
  const blob = await res.blob()
  if (blob.size <= 0) {
    throw new Error('Downloaded video file is empty.')
  }
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
  return true
}

export type ResolveMp4DownloadParams = {
  projectId?: string | null
  videoUrl?: string | null
  filename: string
  /** Compile when no cached reel URL is available */
  compileIfNeeded?: boolean
  onProgress?: (label: string) => void
}

async function compileAndDownload(
  projectId: string,
  filename: string,
  onProgress?: (label: string) => void
): Promise<string> {
  if (typeof compileProjectMp4 !== 'function') {
    console.error('[EXPORT] compile function unavailable', { projectId })
    throw new Error(ASSET_UNAVAILABLE_MSG)
  }
  recordExportStarted(projectId)
  if (typeof onProgress === 'function') {
    onProgress('Preparing your video…')
  }
  const onCompileProgress =
    typeof onProgress === 'function'
      ? onProgress
      : undefined
  const videoUrl = await compileProjectMp4(projectId, { onProgress: onCompileProgress })
  recordExportSuccess(projectId)

  if (!isValidReelDownloadUrl(videoUrl)) {
    throw new Error(ASSET_UNAVAILABLE_MSG)
  }

  if (projectId) {
    const downloaded = await downloadViaProjectFileEndpoint(projectId, filename)
    if (downloaded) {
      recordDownloadSuccess(projectId)
      return videoUrl
    }
  }
  await downloadMp4File(videoUrl, filename)
  recordDownloadSuccess(projectId)
  return videoUrl
}

/** Download an existing MP4 or compile then download via same-origin API when possible. */
export async function resolveMp4Download(
  params: ResolveMp4DownloadParams
): Promise<string | null> {
  const { projectId, filename, onProgress } = params
  let videoUrl = params.videoUrl?.trim() || null

  try {
    if (!videoUrl && params.compileIfNeeded && projectId) {
      return await compileAndDownload(projectId, filename, onProgress)
    }

    if (projectId) {
      const downloaded = await downloadViaProjectFileEndpoint(projectId, filename)
      if (downloaded) {
        recordDownloadSuccess(projectId)
        return videoUrl ?? projectMp4FileDownloadPath(projectId)
      }
      if (videoUrl) {
        throw new Error(EXPORT_EXPIRED_MSG)
      }
    }

    if (videoUrl) {
      if (!isValidReelDownloadUrl(videoUrl)) {
        throw new Error(ASSET_UNAVAILABLE_MSG)
      }
      try {
        await downloadMp4File(videoUrl, filename)
        recordDownloadSuccess(projectId)
        return videoUrl
      } catch {
        if (params.compileIfNeeded && projectId) {
          return compileAndDownload(projectId, filename, onProgress)
        }
        throw new Error(ASSET_UNAVAILABLE_MSG)
      }
    }

    if (params.compileIfNeeded && projectId) {
      return compileAndDownload(projectId, filename, onProgress)
    }

    throw new Error(ASSET_UNAVAILABLE_MSG)
  } catch (err) {
    const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
    if (params.compileIfNeeded && projectId) {
      recordExportFailure(message, projectId)
    }
    recordDownloadFailure(message, projectId)
    throw err
  }
}
