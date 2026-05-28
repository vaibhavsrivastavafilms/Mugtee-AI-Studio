import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export function slugifyExportBase(name: string, fallback: string): string {
  return (
    name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || fallback
  )
}

export function sceneImageFilename(base: string, index: number, ext: 'jpg' | 'png' = 'jpg'): string {
  return `${base}-scene-${String(index + 1).padStart(2, '0')}.${ext}`
}

/** Downloads a storyboard still as JPG (converts when needed) or PNG. */
export async function downloadSceneImage(
  url: string,
  filename: string,
  format: 'jpg' | 'png' = 'jpg'
): Promise<void> {
  const safeName = filename.includes('.') ? filename : `${filename}.${format}`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()

    if (format === 'png') {
      triggerBlobDownload(blob, safeName.endsWith('.png') ? safeName : `${safeName.replace(/\.\w+$/, '')}.png`)
      return
    }

    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    const jpgBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('JPG conversion failed'))),
        'image/jpeg',
        0.92
      )
    })

    const jpgName = safeName.endsWith('.jpg') || safeName.endsWith('.jpeg')
      ? safeName
      : `${safeName.replace(/\.\w+$/, '')}.jpg`
    triggerBlobDownload(jpgBlob, jpgName)
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
  baseName: string
): Promise<number> {
  const slug = slugifyExportBase(baseName, 'mugtee-storyboard')
  let count = 0

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const url = resolveScenePreviewUrl(scene, i)
    if (!url?.trim()) continue
    await downloadSceneImage(url, sceneImageFilename(slug, i), 'jpg')
    count += 1
    if (i < scenes.length - 1) {
      await new Promise((r) => window.setTimeout(r, DOWNLOAD_GAP_MS))
    }
  }

  return count
}
