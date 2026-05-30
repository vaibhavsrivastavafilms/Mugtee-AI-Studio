import fs from 'fs/promises'
import path from 'path'

function mimeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.m4a':
    case '.aac':
      return 'audio/mp4'
    case '.ogg':
      return 'audio/ogg'
    default:
      return ext === '.mp4' ? 'video/mp4' : 'image/jpeg'
  }
}

/** Headless Chromium cannot load file:// — encode local temp assets as data URLs. */
export async function localPathToDataUrl(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath)
  return `data:${mimeForPath(filePath)};base64,${buf.toString('base64')}`
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}
