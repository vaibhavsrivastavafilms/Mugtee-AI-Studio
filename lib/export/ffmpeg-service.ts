'use client'

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

export type FFmpegLogLevel = 'info' | 'warn' | 'error'

export type FFmpegLogEntry = {
  level: FFmpegLogLevel
  message: string
}

export type FFmpegProgress = {
  ratio: number
  timeMs?: number
}

export class FFmpegServiceError extends Error {
  readonly stderr: string[]
  readonly exitCode?: number

  constructor(message: string, options?: { stderr?: string[]; exitCode?: number; cause?: unknown }) {
    super(message)
    this.name = 'FFmpegServiceError'
    this.stderr = options?.stderr ?? []
    this.exitCode = options?.exitCode
    if (options?.cause) this.cause = options.cause
  }
}

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null
const logBuffer: string[] = []

function pushLog(message: string, level: FFmpegLogLevel = 'info'): void {
  logBuffer.push(message)
  if (logBuffer.length > 200) logBuffer.shift()
}

function ffmpegCoreBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/ffmpeg`
}

export function getFFmpegLogs(): FFmpegLogEntry[] {
  return logBuffer.map((message) => ({ level: 'info' as const, message }))
}

export async function initFFmpeg(options?: {
  threaded?: boolean
  onLog?: (entry: FFmpegLogEntry) => void
  onProgress?: (progress: FFmpegProgress) => void
}): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const base = ffmpegCoreBaseUrl()
    const wantThreaded = Boolean(options?.threaded)
    const loadTimeoutMs = 90_000

    const attachListeners = (ffmpeg: FFmpeg) => {
      ffmpeg.on('log', ({ message }) => {
        pushLog(message)
        options?.onLog?.({ level: 'info', message })
      })
      ffmpeg.on('progress', ({ progress, time }) => {
        options?.onProgress?.({
          ratio: Math.min(1, Math.max(0, progress)),
          timeMs: typeof time === 'number' ? time * 1000 : undefined,
        })
      })
    }

    const loadCore = async (useThreaded: boolean): Promise<FFmpeg> => {
      const ffmpeg = new FFmpeg()
      attachListeners(ffmpeg)
      const coreJs = useThreaded ? 'ffmpeg-core-mt.js' : 'ffmpeg-core.js'
      const coreWasm = useThreaded ? 'ffmpeg-core-mt.wasm' : 'ffmpeg-core.wasm'

      const loadTask = ffmpeg.load({
        classWorkerURL: `${base}/ffmpeg-class-worker.js`,
        coreURL: await toBlobURL(`${base}/${coreJs}`, 'text/javascript'),
        wasmURL: await toBlobURL(`${base}/${coreWasm}`, 'application/wasm'),
        ...(useThreaded
          ? {
              workerURL: await toBlobURL(`${base}/ffmpeg-core.worker.js`, 'text/javascript'),
            }
          : {}),
      })

      await Promise.race([
        loadTask,
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`FFmpeg.wasm load timed out after ${loadTimeoutMs / 1000}s`)),
            loadTimeoutMs
          )
        }),
      ])
      return ffmpeg
    }

    try {
      ffmpegInstance = await loadCore(wantThreaded)
    } catch (err) {
      if (wantThreaded) {
        pushLog('Threaded FFmpeg load failed; falling back to single-thread core.')
        ffmpegInstance = await loadCore(false)
      } else {
        throw err
      }
    }

    return ffmpegInstance
  })()

  try {
    return await loadPromise
  } catch (err) {
    loadPromise = null
    throw new FFmpegServiceError('Failed to load FFmpeg.wasm', {
      stderr: [...logBuffer],
      cause: err,
    })
  }
}

async function ensureFFmpeg(
  callbacks?: Parameters<typeof initFFmpeg>[0]
): Promise<FFmpeg> {
  return initFFmpeg(callbacks)
}

/**
 * Example: transcode WebM/PNG sequence to MP4
 * ffmpeg -i input.webm -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart output.mp4
 */
export async function transcodeBlob(
  inputBlob: Blob,
  inputName: string,
  outputName: string,
  ffmpegArgs: string[],
  callbacks?: {
    onLog?: (entry: FFmpegLogEntry) => void
    onProgress?: (progress: FFmpegProgress) => void
  }
): Promise<Blob> {
  const ffmpeg = await ensureFFmpeg(callbacks)
  const stderrBefore = logBuffer.length

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(inputBlob))
    const args = ['-i', inputName, ...ffmpegArgs, outputName]
    const code = await ffmpeg.exec(args)
    if (code !== 0) {
      throw new FFmpegServiceError(`FFmpeg transcode failed (exit ${code})`, {
        stderr: logBuffer.slice(stderrBefore),
        exitCode: code,
      })
    }
    const data = await ffmpeg.readFile(outputName)
    const bytes =
      data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
    return new Blob([bytes], { type: 'video/mp4' })
  } finally {
    await cleanupFFmpegFiles([inputName, outputName])
  }
}

/**
 * Example: mux H.264 + AAC to output.mp4
 * ffmpeg -i video.h264 -i audio.m4a -c:v copy -c:a aac -shortest -movflags +faststart output.mp4
 */
export async function muxAudioVideo(
  videoBlob: Blob,
  audioBlob: Blob,
  outputName: string,
  options?: {
    videoInputName?: string
    audioInputName?: string
    onLog?: (entry: FFmpegLogEntry) => void
    onProgress?: (progress: FFmpegProgress) => void
  }
): Promise<Blob> {
  const videoInputName = options?.videoInputName ?? 'mux-video.bin'
  const audioInputName = options?.audioInputName ?? 'mux-audio.m4a'
  const ffmpeg = await ensureFFmpeg(options)
  const stderrBefore = logBuffer.length

  try {
    await ffmpeg.writeFile(videoInputName, await fetchFile(videoBlob))
    await ffmpeg.writeFile(audioInputName, await fetchFile(audioBlob))
    const code = await ffmpeg.exec([
      '-i',
      videoInputName,
      '-i',
      audioInputName,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-shortest',
      '-movflags',
      '+faststart',
      outputName,
    ])
    if (code !== 0) {
      throw new FFmpegServiceError(`FFmpeg mux failed (exit ${code})`, {
        stderr: logBuffer.slice(stderrBefore),
        exitCode: code,
      })
    }
    const data = await ffmpeg.readFile(outputName)
    const bytes =
      data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
    return new Blob([bytes], { type: 'video/mp4' })
  } finally {
    await cleanupFFmpegFiles([videoInputName, audioInputName, outputName])
  }
}

/**
 * Example: concat compatible segments (same codec/resolution)
 * ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
 */
export async function concatSegments(
  segmentFiles: { name: string; blob: Blob }[],
  outputName: string,
  callbacks?: {
    onLog?: (entry: FFmpegLogEntry) => void
    onProgress?: (progress: FFmpegProgress) => void
  }
): Promise<Blob> {
  if (segmentFiles.length === 0) {
    throw new FFmpegServiceError('concatSegments requires at least one segment')
  }

  const ffmpeg = await ensureFFmpeg(callbacks)
  const stderrBefore = logBuffer.length
  const listName = 'concat-list.txt'
  const names = segmentFiles.map((s) => s.name)

  try {
    for (const seg of segmentFiles) {
      await ffmpeg.writeFile(seg.name, await fetchFile(seg.blob))
    }
    const listBody = names.map((n) => `file '${n.replace(/'/g, "'\\''")}'`).join('\n')
    await ffmpeg.writeFile(listName, new TextEncoder().encode(listBody))

    const code = await ffmpeg.exec([
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listName,
      '-c',
      'copy',
      outputName,
    ])
    if (code !== 0) {
      throw new FFmpegServiceError(`FFmpeg concat failed (exit ${code})`, {
        stderr: logBuffer.slice(stderrBefore),
        exitCode: code,
      })
    }
    const data = await ffmpeg.readFile(outputName)
    const bytes =
      data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
    return new Blob([bytes], { type: 'video/mp4' })
  } finally {
    await cleanupFFmpegFiles([...names, listName, outputName])
  }
}

export async function cleanupFFmpegFiles(fileNames: string[]): Promise<void> {
  if (!ffmpegInstance?.loaded) return
  for (const name of fileNames) {
    try {
      await ffmpegInstance.deleteFile(name)
    } catch {
      /* already removed */
    }
  }
}

export async function writeBlobToFS(name: string, blob: Blob): Promise<void> {
  const ffmpeg = await ensureFFmpeg()
  await ffmpeg.writeFile(name, await fetchFile(blob))
}

export async function readBlobFromFS(name: string, mime = 'application/octet-stream'): Promise<Blob> {
  const ffmpeg = await ensureFFmpeg()
  const data = await ffmpeg.readFile(name)
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data))
  return new Blob([bytes], { type: mime })
}

export async function runFFmpegExec(
  args: string[],
  cleanup: string[] = [],
  callbacks?: {
    onLog?: (entry: FFmpegLogEntry) => void
    onProgress?: (progress: FFmpegProgress) => void
  }
): Promise<number> {
  const ffmpeg = await ensureFFmpeg(callbacks)
  const stderrBefore = logBuffer.length
  try {
    const code = await ffmpeg.exec(args)
    if (code !== 0) {
      throw new FFmpegServiceError(`FFmpeg exec failed (exit ${code})`, {
        stderr: logBuffer.slice(stderrBefore),
        exitCode: code,
      })
    }
    return code
  } finally {
    if (cleanup.length) await cleanupFFmpegFiles(cleanup)
  }
}
