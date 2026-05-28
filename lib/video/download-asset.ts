import fs from 'fs/promises'
import path from 'path'

export async function downloadToFile(url: string, destPath: string): Promise<void> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) throw new Error('Invalid data URI')
    const buffer = Buffer.from(match[2], 'base64')
    await fs.writeFile(destPath, buffer)
    return
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`Failed to download asset (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(destPath, buf)
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

export function extFromUrl(url: string, fallback: string): string {
  if (url.startsWith('data:audio/mpeg')) return '.mp3'
  if (url.startsWith('data:image/png')) return '.png'
  if (url.startsWith('data:image/jpeg')) return '.jpg'
  try {
    const pathname = new URL(url).pathname
    const ext = path.extname(pathname)
    if (ext) return ext
  } catch {
    /* relative */
  }
  return fallback
}
