import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export type SceneImageExportSize = 'vertical' | 'horizontal'

export const SCENE_IMAGE_EXPORT_DIMENSIONS: Record<
  SceneImageExportSize,
  { width: number; height: number; label: string }
> = {
  vertical: { width: 1080, height: 1920, label: '1080×1920' },
  horizontal: { width: 1920, height: 1080, label: '1920×1080' },
}

export function slugifyExportBase(name: string, fallback: string): string {
  return (
    name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || fallback
  )
}

export function sceneImageFilename(
  base: string,
  index: number,
  ext: 'jpg' | 'png' = 'jpg',
  exportSize: SceneImageExportSize = 'vertical'
): string {
  const { width, height } = SCENE_IMAGE_EXPORT_DIMENSIONS[exportSize]
  return `${base}-scene-${String(index + 1).padStart(2, '0')}-${width}x${height}.${ext}`
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  targetWidth: number,
  targetHeight: number
): void {
  const srcAspect = bitmap.width / bitmap.height
  const dstAspect = targetWidth / targetHeight

  let sx = 0
  let sy = 0
  let sw = bitmap.width
  let sh = bitmap.height

  if (srcAspect > dstAspect) {
    sw = bitmap.height * dstAspect
    sx = (bitmap.width - sw) / 2
  } else {
    sh = bitmap.width / dstAspect
    sy = (bitmap.height - sh) / 2
  }

  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)
}

async function blobToExportBlob(
  blob: Blob,
  format: 'jpg' | 'png',
  exportSize: SceneImageExportSize
): Promise<Blob> {
  const { width, height } = SCENE_IMAGE_EXPORT_DIMENSIONS[exportSize]
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  drawImageCover(ctx, bitmap, width, height)
  bitmap.close()

  if (format === 'png') {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG conversion failed'))),
        'image/png'
      )
    })
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('JPG conversion failed'))),
      'image/jpeg',
      0.92
    )
  })
}

/** Downloads a storyboard still as JPG (converts when needed) or PNG at the target export size. */
export async function downloadSceneImage(
  url: string,
  filename: string,
  format: 'jpg' | 'png' = 'jpg',
  exportSize: SceneImageExportSize = 'vertical'
): Promise<void> {
  const safeName = filename.includes('.') ? filename : `${filename}.${format}`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const exportBlob = await blobToExportBlob(blob, format, exportSize)
    triggerBlobDownload(exportBlob, safeName)
  } catch {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = safeName
    anchor.rel = 'noopener'
    anchor.target = '_blank'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
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

const DOWNLOAD_GAP_MS = 400

/** Downloads each scene still sequentially (browser-friendly). */
export async function downloadAllStoryboardImages(
  scenes: GeneratedScene[],
  baseName: string,
  exportSize: SceneImageExportSize = 'vertical'
): Promise<number> {
  const slug = slugifyExportBase(baseName, 'mugtee-storyboard')
  let count = 0

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const url = resolveScenePreviewUrl(scene, i)
    if (!url?.trim()) continue
    await downloadSceneImage(url, sceneImageFilename(slug, i, 'jpg', exportSize), 'jpg', exportSize)
    count += 1
    if (i < scenes.length - 1) {
      await new Promise((r) => window.setTimeout(r, DOWNLOAD_GAP_MS))
    }
  }

  return count
}
