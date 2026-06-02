import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  compileProjectMp4,
  quickCutCanCompileMp4,
} from '@/lib/quick-cut/compile-project-mp4.client'
import { projectMp4FileDownloadPath } from '@/lib/quick-cut/resolve-mp4-download.client'
import { blobToUint8Array } from '@/lib/quick-cut/zip-store.client'

export type FetchMp4BytesInput = {
  videoUrl: string | null
  voiceUrl: string | null
  scenes: GeneratedScene[]
  videoRenderEnabled: boolean
  savedProjectId?: string | null
  onProgress?: (phase: string) => void
}

/** Resolves rendered MP4 bytes for ZIP export — compiles on demand when eligible. */
export async function fetchMp4Bytes(input: FetchMp4BytesInput): Promise<Uint8Array | null> {
  const { savedProjectId: projectId } = input
  let videoUrl = input.videoUrl?.trim() || null
  const canCompile = quickCutCanCompileMp4(
    input.scenes,
    input.voiceUrl,
    input.videoRenderEnabled
  )

  if (!videoUrl && canCompile && projectId) {
    input.onProgress?.('Rendering video…')
    videoUrl = await compileProjectMp4(projectId, {
      onProgress: (label) => input.onProgress?.(label),
    })
  }

  if (projectId) {
    const res = await fetch(projectMp4FileDownloadPath(projectId), {
      credentials: 'include',
    })
    if (res.ok) {
      return blobToUint8Array(await res.blob())
    }
  }

  if (videoUrl) {
    const sameOrigin =
      videoUrl.startsWith('/') ||
      (typeof window !== 'undefined' &&
        new URL(videoUrl, window.location.origin).origin === window.location.origin)

    const res = await fetch(
      videoUrl,
      sameOrigin ? { credentials: 'include' } : undefined
    )
    if (res.ok) {
      return blobToUint8Array(await res.blob())
    }

    if (canCompile && projectId) {
      input.onProgress?.('Rendering video…')
      const compiledUrl = await compileProjectMp4(projectId, {
        onProgress: (label) => input.onProgress?.(label),
      })
      const retry = await fetch(compiledUrl, { credentials: 'include' })
      if (retry.ok) {
        return blobToUint8Array(await retry.blob())
      }
    }
  }

  return null
}
