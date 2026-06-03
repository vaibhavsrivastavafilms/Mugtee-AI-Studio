'use client'

import { detectExportCapabilities, type ExportStrategy } from '@/lib/export/export-capabilities'
import {
  FFmpegServiceError,
  initFFmpeg,
  muxAudioVideo,
  transcodeBlob,
  writeBlobToFS,
  readBlobFromFS,
  runFFmpegExec,
  cleanupFFmpegFiles,
  type FFmpegProgress,
} from '@/lib/export/ffmpeg-service'
import {
  renderTimelineToFrames,
  revokeRenderedFrames,
  type RenderedFrame,
} from '@/lib/export/timeline-frame-renderer.client'
import type {
  BrowserExportJob,
  BrowserExportPhase,
  BrowserExportProgress,
  BrowserExportResult,
  BrowserExportSettings,
  BrowserExportTiming,
} from '@/lib/export/browser-export-types'

export type { BrowserExportJob, BrowserExportPhase, BrowserExportProgress, BrowserExportResult }

type PhaseCallback = (progress: BrowserExportProgress) => void

let activeObjectUrls: string[] = []

function newTiming(phase: BrowserExportPhase): BrowserExportTiming {
  const now = Date.now()
  return { phase, startedAt: now, phaseStartedAt: now, phaseDurationsMs: {} }
}

function advancePhase(timing: BrowserExportTiming, phase: BrowserExportPhase): BrowserExportTiming {
  const now = Date.now()
  timing.phaseDurationsMs[timing.phase] = now - timing.phaseStartedAt
  return { ...timing, phase, phaseStartedAt: now }
}

function emit(
  onProgress: PhaseCallback | undefined,
  timing: BrowserExportTiming,
  progress: number,
  message: string
): void {
  onProgress?.({ phase: timing.phase, progress, message, timing })
}

async function fetchAudioBlob(voiceUrl: string | null): Promise<Blob | null> {
  if (!voiceUrl?.trim()) return null
  const res = await fetch(voiceUrl, { mode: 'cors' })
  if (!res.ok) throw new Error(`Voice track fetch failed (${res.status})`)
  return res.blob()
}

async function pickH264Codec(width: number, height: number, fps: number): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null
  const candidates = ['avc1.42E01E', 'avc1.4D401E', 'h264']
  for (const codec of candidates) {
    const support = await VideoEncoder.isConfigSupported({
      codec,
      width,
      height,
      bitrate: 4_000_000,
      framerate: fps,
    })
    if (support.supported) return codec
  }
  return null
}

export async function encodeWithWebCodecs(
  frames: RenderedFrame[],
  settings: BrowserExportSettings,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const codec = await pickH264Codec(settings.width, settings.height, settings.fps)
  if (!codec) throw new Error('WebCodecs H.264 encoder not supported')

  const chunks: Uint8Array[] = []
  const encoder = new VideoEncoder({
    output: (chunk) => {
      const copy = new Uint8Array(chunk.byteLength)
      chunk.copyTo(copy)
      chunks.push(copy)
    },
    error: (e) => {
      throw e
    },
  })

  encoder.configure({
    codec,
    width: settings.width,
    height: settings.height,
    bitrate: 4_000_000,
    framerate: settings.fps,
  })

  const frameDurationUs = Math.round(1_000_000 / settings.fps)
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const videoFrame = new VideoFrame(frame.bitmap, {
      timestamp: frame.timestampUs,
      duration: frameDurationUs,
    })
    encoder.encode(videoFrame, { keyFrame: i % (settings.fps * 2) === 0 })
    videoFrame.close()
    onProgress?.((i + 1) / frames.length)
  }

  await encoder.flush()
  encoder.close()

  const total = chunks.reduce((n, c) => n + c.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.length
  }
  return new Blob([merged], { type: 'video/h264' })
}

export async function fallbackEncodeWithFFmpeg(
  frames: RenderedFrame[],
  settings: BrowserExportSettings,
  onProgress?: (p: FFmpegProgress) => void
): Promise<Blob> {
  await initFFmpeg({ onProgress })
  const stderrFiles: string[] = []

  try {
    for (let i = 0; i < frames.length; i++) {
      const name = `frame-${String(i).padStart(5, '0')}.png`
      const canvas = document.createElement('canvas')
      canvas.width = settings.width
      canvas.height = settings.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable for FFmpeg fallback')
      ctx.drawImage(frames[i].bitmap, 0, 0)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png')
      })
      await writeBlobToFS(name, blob)
      stderrFiles.push(name)
    }

    const outputName = 'ffmpeg-fallback.mp4'
    await runFFmpegExec(
      [
        '-framerate',
        String(settings.fps),
        '-i',
        'frame-%05d.png',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        outputName,
      ],
      [],
      { onProgress }
    )
    const blob = await readBlobFromFS(outputName, 'video/mp4')
    await cleanupFFmpegFiles([...stderrFiles, outputName])
    return blob
  } catch (err) {
    await cleanupFFmpegFiles(stderrFiles)
    throw err
  }
}

export async function muxFinalOutput(input: {
  videoBlob: Blob
  audioBlob: Blob | null
  videoIsH264?: boolean
}): Promise<Blob> {
  if (!input.audioBlob) return input.videoBlob

  if (input.videoBlob.type.includes('mp4') && !input.videoIsH264) {
    return input.videoBlob
  }

  const videoName = input.videoIsH264 ? 'video.h264' : 'video.mp4'
  if (input.videoIsH264) {
    await writeBlobToFS(videoName, input.videoBlob)
    await writeBlobToFS('audio.m4a', input.audioBlob)
    await runFFmpegExec([
      '-i',
      videoName,
      '-i',
      'audio.m4a',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-shortest',
      '-movflags',
      '+faststart',
      'browser-export.mp4',
    ])
    const out = await readBlobFromFS('browser-export.mp4', 'video/mp4')
    await cleanupFFmpegFiles([videoName, 'audio.m4a', 'browser-export.mp4'])
    return out
  }

  return muxAudioVideo(input.videoBlob, input.audioBlob, 'browser-export.mp4', {
    videoInputName: 'mux-video.mp4',
    audioInputName: 'mux-audio.m4a',
  })
}

export async function startExport(
  job: BrowserExportJob,
  onProgress?: PhaseCallback
): Promise<BrowserExportResult> {
  const caps = detectExportCapabilities()
  if (caps.blockers.length) {
    throw new Error(caps.blockers.join(' '))
  }

  const strategy: ExportStrategy =
    job.strategy ?? caps.recommendedStrategy
  if (strategy === 'blocked') {
    throw new Error('Browser export is blocked on this device.')
  }

  let timing = newTiming('preparing')
  emit(onProgress, timing, 0, 'Preparing browser export…')

  emit(onProgress, timing, 0.01, 'Loading FFmpeg.wasm…')
  await initFFmpeg({
    threaded: caps.canUseThreadedFFmpeg,
    onProgress: (p) => {
      if (timing.phase === 'preparing') {
        emit(onProgress, timing, 0.01 + p.ratio * 0.04, 'Loading FFmpeg.wasm…')
      } else if (timing.phase === 'encoding' || timing.phase === 'muxing') {
        emit(onProgress, timing, p.ratio, 'FFmpeg processing…')
      }
    },
  })

  timing = advancePhase(timing, 'rendering')
  emit(onProgress, timing, 0, 'Rendering timeline frames…')

  let frames: RenderedFrame[] = []
  try {
    frames = await renderTimelineToFrames(job.timeline, job.settings, (ratio) => {
      emit(onProgress, timing, ratio * 0.45, 'Rendering frames…')
    })

    timing = advancePhase(timing, 'encoding')
    emit(onProgress, timing, 0.5, 'Encoding video…')

    let videoBlob: Blob
    let videoIsH264 = false

    if (strategy === 'webcodecs-ffmpeg-mux' && caps.canUseWebCodecs) {
      try {
        videoBlob = await encodeWithWebCodecs(frames, job.settings, (ratio) => {
          emit(onProgress, timing, 0.5 + ratio * 0.25, 'WebCodecs encoding…')
        })
        videoIsH264 = true
      } catch {
        videoBlob = await fallbackEncodeWithFFmpeg(frames, job.settings, (p) => {
          emit(onProgress, timing, 0.5 + p.ratio * 0.25, 'FFmpeg frame encoding…')
        })
      }
    } else if (strategy === 'ffmpeg-transcode' || caps.canUseFFmpeg) {
      videoBlob = await fallbackEncodeWithFFmpeg(frames, job.settings, (p) => {
        emit(onProgress, timing, 0.5 + p.ratio * 0.25, 'FFmpeg frame encoding…')
      })
    } else {
      throw new Error('No encoding path available')
    }

    timing = advancePhase(timing, 'muxing')
    emit(onProgress, timing, 0.78, 'Muxing audio…')

    const audioBlob = await fetchAudioBlob(job.timeline.voiceUrl)
    let finalBlob = await muxFinalOutput({ videoBlob, audioBlob, videoIsH264 })

    if (!finalBlob.type.includes('mp4')) {
      finalBlob = await transcodeBlob(finalBlob, 'pre-mux.bin', 'browser-export.mp4', [
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
      ])
    }

    timing = advancePhase(timing, 'finalizing')
    emit(onProgress, timing, 0.95, 'Finalizing…')

    const objectUrl = URL.createObjectURL(finalBlob)
    activeObjectUrls.push(objectUrl)

    timing = advancePhase(timing, 'complete')
    emit(onProgress, timing, 1, 'Export complete')

    return {
      blob: finalBlob,
      mimeType: 'video/mp4',
      objectUrl,
      strategy,
      timing,
    }
  } catch (err) {
    timing = advancePhase(timing, 'failed')
    const message =
      err instanceof FFmpegServiceError
        ? `${err.message}${err.stderr.length ? `: ${err.stderr.slice(-3).join(' ')}` : ''}`
        : err instanceof Error
          ? err.message
          : 'Browser export failed'
    emit(onProgress, timing, 0, message)
    throw err
  } finally {
    await revokeRenderedFrames(frames)
  }
}

export function revokeBrowserExportUrls(): void {
  for (const url of activeObjectUrls) {
    URL.revokeObjectURL(url)
  }
  activeObjectUrls = []
}

export function defaultBrowserExportSettings(timeline: BrowserExportJob['timeline']): BrowserExportSettings {
  return {
    width: 1080,
    height: 1920,
    fps: 30,
    durationSec: timeline.totalDurationSec,
  }
}
