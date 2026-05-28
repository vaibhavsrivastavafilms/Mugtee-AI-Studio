/**
 * Resolves ffmpeg binary — ffmpeg-static on Node; system FFMPEG_PATH fallback.
 *
 * Vercel/serverless: ffmpeg-static binaries are often too large or lack write access.
 * Run renders on local Node, a dedicated worker, or Docker — not edge/serverless.
 * Dev-only stub: VIDEO_RENDER_MOCK=true (see render-pipeline.ts).
 */
export function resolveFfmpegPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static') as string | null
    if (ffmpegStatic && typeof ffmpegStatic === 'string') return ffmpegStatic
  } catch {
    /* optional dep */
  }
  return process.env.FFMPEG_PATH?.trim() || null
}

export function isFfmpegAvailable(): boolean {
  if (process.env.VIDEO_RENDER_MOCK === 'true') return true
  return resolveFfmpegPath() != null
}
