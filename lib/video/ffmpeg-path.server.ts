import 'server-only'

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

/**
 * Resolves ffmpeg binary — ffmpeg-static on Node; system FFMPEG_PATH fallback.
 *
 * Next.js webpack can rewrite ffmpeg-static's __dirname to .next/server/vendor-chunks,
 * producing ENOENT on spawn. We verify the path exists and fall back to the real package dir.
 *
 * Vercel/serverless: ffmpeg-static binaries are often too large or lack write access.
 * Run renders on local Node, a dedicated worker, or Docker — not edge/serverless.
 * Dev-only stub: VIDEO_RENDER_MOCK=true (see render-pipeline.ts).
 */

const nodeRequire = createRequire(
  typeof __filename !== 'undefined' ? __filename : path.join(process.cwd(), 'package.json')
)

function pathExists(candidate: string | null | undefined): candidate is string {
  if (!candidate?.trim()) return false
  try {
    fs.accessSync(candidate.trim(), fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

function resolveFromFfmpegStaticPackage(): string | null {
  try {
    const pkgJson = nodeRequire.resolve('ffmpeg-static/package.json')
    const pkgDir = path.dirname(pkgJson)
    const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
    const candidate = path.join(pkgDir, exe)
    return pathExists(candidate) ? candidate : null
  } catch {
    return null
  }
}

export function resolveFfmpegPath(): string | null {
  const envPath =
    process.env.FFMPEG_PATH?.trim() ||
    process.env.FFMPEG_BIN?.trim() ||
    null
  if (pathExists(envPath)) return envPath

  try {
    const ffmpegStatic = nodeRequire('ffmpeg-static') as string | null
    if (pathExists(ffmpegStatic)) return ffmpegStatic
  } catch {
    /* optional dep */
  }

  return resolveFromFfmpegStaticPackage()
}

export function isFfmpegAvailable(): boolean {
  if (process.env.VIDEO_RENDER_MOCK === 'true') return true
  return resolveFfmpegPath() != null
}
