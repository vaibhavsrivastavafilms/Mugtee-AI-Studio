function isSameOriginUrl(url: string): boolean {
  if (url.startsWith('/')) return true
  try {
    return new URL(url).origin === window.location.origin
  } catch {
    return false
  }
}

/** Triggers a browser download with a guaranteed .mp4 filename. */
export async function downloadMp4File(url: string, filename: string): Promise<void> {
  const safeName = filename.endsWith('.mp4') ? filename : `${filename}.mp4`
  const sameOrigin = typeof window !== 'undefined' && isSameOriginUrl(url)

  try {
    const res = await fetch(url, sameOrigin ? { credentials: 'include' } : undefined)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = safeName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
    return
  } catch {
    /* fall through to direct navigation */
  }

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeName
  anchor.rel = 'noopener'
  anchor.target = '_blank'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  if (!sameOrigin) {
    throw new Error('Download opened in a new tab — use Save As if the file did not download.')
  }
}
