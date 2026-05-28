import type { CinematicRenderIntent } from '@/lib/cinematic/execution/render/cinematic-render-intent'

let ffmpegAvailable: boolean | null = null

function checkFfmpegAvailable(): boolean {
  if (ffmpegAvailable != null) return ffmpegAvailable
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('ffmpeg-static')
    ffmpegAvailable = true
  } catch {
    ffmpegAvailable = false
  }
  return ffmpegAvailable
}

/** Returns assembly mode — ffmpeg when deps exist and shots have direction digests. */
export function resolveFfmpegAssemblyMode(
  intent: CinematicRenderIntent
): 'metadata' | 'ffmpeg' {
  if (!checkFfmpegAvailable()) return 'metadata'
  if (intent.shots.length < 1) return 'metadata'
  const hasAssemblyHints = intent.shots.every((s) => s.directionDigest.length > 0)
  return hasAssemblyHints ? 'ffmpeg' : 'metadata'
}

/** Assembly-ready timing spec for future FFmpeg providers — no file I/O. */
export function buildFfmpegAssemblySpec(
  intent: CinematicRenderIntent,
  segmentTimingMs: Array<{ startMs: number; durationMs: number; transitionOutMs: number }>
): {
  mode: 'metadata' | 'ffmpeg'
  filterGraph: string
  outputFormat: 'mp4'
  aspectRatio: '9:16'
} {
  const mode = resolveFfmpegAssemblyMode(intent)
  const filters = segmentTimingMs
    .map((seg, i) => {
      const fadeOut = seg.transitionOutMs / 1000
      return `[v${i}]trim=duration=${seg.durationMs / 1000},fade=t=out:st=${(seg.durationMs / 1000 - fadeOut).toFixed(2)}:d=${fadeOut.toFixed(2)}[seg${i}]`
    })
    .join(';')

  return {
    mode,
    filterGraph: filters || 'null',
    outputFormat: 'mp4',
    aspectRatio: '9:16',
  }
}
