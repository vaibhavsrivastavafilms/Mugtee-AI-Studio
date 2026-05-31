import {
  compileProjectMp4,
  quickCutCanCompileMp4,
} from '@/lib/quick-cut/compile-project-mp4.client'
import {
  fetchSceneImageBlob,
  slugifyExportBase,
} from '@/lib/quick-cut/download-scene-image'
import { projectMp4FileDownloadPath } from '@/lib/quick-cut/resolve-mp4-download.client'
import {
  buildInstagramCaption,
  buildInstagramCoverTitle,
  buildInstagramHashtags,
  buildPlatformScriptText,
  buildTikTokCaption,
  buildTikTokHook,
  buildYouTubeDescription,
  buildYouTubeTags,
  PLATFORM_PROFILES,
  resolveThumbnailImageUrl,
  type PlatformExportId,
  type PlatformExportInput,
} from '@/lib/quick-cut/platform-export-profiles'
import {
  blobToUint8Array,
  createStoreZip,
  textToUint8Array,
  type ZipEntry,
} from '@/lib/quick-cut/zip-store.client'

export type PlatformPackMetadata = {
  format: 'mugtee-platform-pack'
  platform: PlatformExportId
  exportedAt: string
  projectId: string | null
  title: string
  included: string[]
  warnings: string[]
}

export type PlatformPackExportResult = {
  blob: Blob
  filename: string
  metadata: PlatformPackMetadata
}

export type PlatformPackExportProgress = {
  phase: string
  progress: number
}

async function fetchMp4Bytes(input: PlatformExportInput): Promise<Uint8Array | null> {
  const { savedProjectId: projectId } = input
  let videoUrl = input.videoUrl?.trim() || null
  const canCompile = quickCutCanCompileMp4(
    input.scenes,
    input.voiceUrl,
    input.videoRenderEnabled
  )

  if (!videoUrl && canCompile && projectId) {
    videoUrl = await compileProjectMp4(projectId)
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
      const compiledUrl = await compileProjectMp4(projectId)
      const retry = await fetch(compiledUrl, { credentials: 'include' })
      if (retry.ok) {
        return blobToUint8Array(await retry.blob())
      }
    }
  }

  return null
}

/** Builds a platform-specific export ZIP from project store data. Skips missing assets. */
export async function buildPlatformPackZip(
  profileId: PlatformExportId,
  input: PlatformExportInput,
  onProgress?: (update: PlatformPackExportProgress) => void
): Promise<PlatformPackExportResult> {
  const profile = PLATFORM_PROFILES[profileId]
  const report = (phase: string, progress: number) => onProgress?.({ phase, progress })

  const exportBase = slugifyExportBase(input.title || 'mugtee-reel', 'mugtee-reel')
  const zipFilename = `${exportBase}-${profile.zipSuffix}.zip`
  const entries: ZipEntry[] = []
  const included: string[] = []
  const warnings: string[] = []

  report('Collecting text assets…', 10)

  if (profileId === 'youtube') {
    if (input.title.trim()) {
      entries.push({ path: 'title.txt', data: textToUint8Array(input.title.trim()) })
      included.push('title.txt')
    } else {
      warnings.push('title.txt skipped — no title available')
    }

    entries.push({
      path: 'description.txt',
      data: textToUint8Array(buildYouTubeDescription(input)),
    })
    included.push('description.txt')

    entries.push({ path: 'tags.txt', data: textToUint8Array(buildYouTubeTags(input)) })
    included.push('tags.txt')

    if (hasExportableScript(input)) {
      entries.push({
        path: 'script.txt',
        data: textToUint8Array(buildPlatformScriptText(input)),
      })
      included.push('script.txt')
    } else {
      warnings.push('script.txt skipped — no script content available')
    }
  }

  if (profileId === 'instagram') {
    entries.push({
      path: 'caption.txt',
      data: textToUint8Array(buildInstagramCaption(input)),
    })
    included.push('caption.txt')

    entries.push({
      path: 'hashtags.txt',
      data: textToUint8Array(buildInstagramHashtags(input)),
    })
    included.push('hashtags.txt')

    entries.push({
      path: 'cover-title.txt',
      data: textToUint8Array(buildInstagramCoverTitle(input)),
    })
    included.push('cover-title.txt')
  }

  if (profileId === 'tiktok') {
    entries.push({ path: 'hook.txt', data: textToUint8Array(buildTikTokHook(input)) })
    included.push('hook.txt')

    entries.push({
      path: 'caption.txt',
      data: textToUint8Array(buildTikTokCaption(input)),
    })
    included.push('caption.txt')
  }

  report('Fetching thumbnail…', 35)

  if (profileId === 'youtube') {
    const thumbnailUrl = resolveThumbnailImageUrl(
      input.scenes,
      input.isGenerating,
      input.thumbnailImageUrl
    )
    if (thumbnailUrl) {
      try {
        const blob = await fetchSceneImageBlob(thumbnailUrl, 'horizontal')
        entries.push({
          path: 'thumbnail.jpg',
          data: await blobToUint8Array(blob),
        })
        included.push('thumbnail.jpg')
      } catch {
        warnings.push('thumbnail.jpg skipped — image fetch failed')
      }
    } else if (input.thumbnailConcept?.trim()) {
      entries.push({
        path: 'thumbnail-concept.txt',
        data: textToUint8Array(input.thumbnailConcept.trim()),
      })
      included.push('thumbnail-concept.txt')
    } else {
      warnings.push('thumbnail skipped — no scene image or concept available')
    }
  }

  report('Fetching video…', 55)

  const videoFilename = profileId === 'instagram' ? 'reel-video.mp4' : 'video.mp4'
  const videoBytes = await fetchMp4Bytes(input)
  if (videoBytes) {
    entries.push({ path: videoFilename, data: videoBytes })
    included.push(videoFilename)
  } else {
    warnings.push(`${videoFilename} skipped — no video available`)
  }

  report('Finalizing archive…', 90)

  const metadata: PlatformPackMetadata = {
    format: 'mugtee-platform-pack',
    platform: profileId,
    exportedAt: new Date().toISOString(),
    projectId: input.savedProjectId ?? null,
    title: input.title || 'Untitled reel',
    included,
    warnings,
  }

  entries.push({
    path: 'platform-metadata.json',
    data: textToUint8Array(JSON.stringify(metadata, null, 2)),
  })
  included.push('platform-metadata.json')

  if (entries.length < 2) {
    throw new Error(`No exportable assets found for ${profile.name} package.`)
  }

  const blob = createStoreZip(entries)
  report(`${profile.name} package ready`, 100)

  return { blob, filename: zipFilename, metadata }
}

function hasExportableScript(input: PlatformExportInput): boolean {
  return Boolean(
    input.script.trim() ||
      input.hook.trim() ||
      input.title.trim() ||
      input.scriptBeats?.some((beat) => beat.narration?.trim())
  )
}

export function triggerPlatformPackDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
