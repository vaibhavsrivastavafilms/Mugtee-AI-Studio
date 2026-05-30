import { ASSET_UNAVAILABLE_MSG } from '@/lib/quick-cut/asset-availability'

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

/** Triggers a browser download with a guaranteed .mp3 filename. */
export async function downloadMp3File(url: string, filename: string): Promise<void> {
  const trimmed = url.trim()
  if (!trimmed) throw new Error(ASSET_UNAVAILABLE_MSG)

  const safeName = filename.endsWith('.mp3') ? filename : `${filename}.mp3`

  if (trimmed.startsWith('data:')) {
    const res = await fetch(trimmed)
    const blob = await res.blob()
    triggerBlobDownload(blob, safeName)
    return
  }

  const res = await fetch(trimmed, { mode: 'cors' })
  if (!res.ok) throw new Error(ASSET_UNAVAILABLE_MSG)
  const blob = await res.blob()
  if (!blob.size) throw new Error(ASSET_UNAVAILABLE_MSG)
  triggerBlobDownload(blob, safeName)
}
