function isSameOriginUrl(url: string): boolean {
  if (url.startsWith('/')) return true
  try {
    return new URL(url).origin === window.location.origin
  } catch {
    return false
  }
}

/** Triggers a browser download with blob fallback (Safari-safe). */
export async function downloadMp4File(url: string, filename: string): Promise<void> {
  const safeName = filename.endsWith('.mp4') ? filename : `${filename}.mp4`
  const sameOrigin = typeof window !== 'undefined' && isSameOriginUrl(url)

  const triggerBlobDownload = (blob: Blob) => {
    if (blob.size <= 0) {
      throw new Error('Downloaded video file is empty.')
    }
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = safeName
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  try {
    const res = await fetch(url, sameOrigin ? { credentials: 'include' } : { mode: 'cors' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    triggerBlobDownload(blob)
    return
  } catch {
    /* fall through to direct navigation */
  }

  if (!sameOrigin) {
    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    if (!opened) {
      throw new Error('Download blocked — allow pop-ups or use Save As.')
    }
    throw new Error('Download opened in a new tab — use Save As if the file did not download.')
  }

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeName
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
