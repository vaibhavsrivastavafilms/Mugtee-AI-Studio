import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import type { RenderSceneInput, SubtitleSegment } from '@/lib/video/types'
import { resolveFfmpegPath } from '@/lib/video/ffmpeg-path.server'
import { downloadToFile, ensureDir, extFromUrl } from '@/lib/video/download-asset'
import { segmentsToSrt } from '@/lib/video/subtitles'
import {
  clampSceneDurationsToTarget,
  computeRenderTotalSec,
} from '@/lib/cinematic/scene-duration'
import { MAX_VIDEO_DURATION_SEC } from '@/lib/workspace/validation'
import { renderPipelineError, renderPipelineLog } from '@/lib/export/render-pipeline-log.server'
import {
  logMemoryTrace,
  logMockRender,
} from '@/lib/video/render-memory-trace.server'
import {
  resolveFfmpegThreadCount,
  resolveFfmpegX264Preset,
  resolveMockRenderDurationSec,
  resolveMockRenderResolution,
} from '@/lib/remotion/render-settings.server'

export const WIDTH = 1080
export const HEIGHT = 1920
export const FPS = 30

const STDERR_CAP_BYTES = 64_000

function appendLibx264EncodeArgs(
  args: string[],
  opts: { preset: string; threads: number; crf?: number }
): void {
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', opts.preset, '-threads', String(opts.threads))
  if (opts.crf != null) args.push('-crf', String(opts.crf))
}

function buildLibx264OutputArgs(opts: {
  preset: string
  threads: number
  fps: number
  crf?: number
}): string[] {
  const out: string[] = []
  appendLibx264EncodeArgs(out, opts)
  out.push('-r', String(opts.fps))
  return out
}

export function runFfmpeg(args: string[], meta?: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = resolveFfmpegPath()
    if (!bin) {
      reject(new Error('FFmpeg binary not found. Install ffmpeg-static or set FFMPEG_PATH.'))
      return
    }
    logMemoryTrace({
      renderer: 'ffmpeg',
      codec: 'libx264',
      ...(meta ?? {}),
    })
    const command = `${bin} ${args.join(' ')}`
    renderPipelineLog('FFMPEG_START', { command: command.slice(0, 500), status: 'spawn', ...(meta ?? {}) })
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < STDERR_CAP_BYTES) {
        stderr += chunk.toString().slice(0, STDERR_CAP_BYTES - stderr.length)
      }
    })
    proc.on('error', (spawnErr) => {
      renderPipelineError('FFMPEG_COMPLETE', spawnErr, {
        command: command.slice(0, 500),
        stderr: stderr.slice(-2000),
      })
      reject(spawnErr)
    })
    proc.on('close', (code) => {
      if (code === 0) {
        renderPipelineLog('FFMPEG_COMPLETE', { status: 'exit_0', codec: 'h264' })
        resolve()
      } else {
        const err = new Error(stderr.slice(-1200) || `ffmpeg exited with code ${code}`)
        renderPipelineError('FFMPEG_COMPLETE', err, {
          command: command.slice(0, 500),
          exitCode: code,
          stderr: stderr.slice(-2000),
        })
        reject(err)
      }
    })
  })
}

export type RenderPipelineInput = {
  scenes: RenderSceneInput[]
  audioPath: string | null
  subtitles: SubtitleSegment[]
  outputPath: string
  crossfadeSec?: number
  /** When true, burn subtitle segments into the exported video. Defaults to off. */
  burnSubtitles?: boolean
}

export async function renderFacelessMp4(input: RenderPipelineInput): Promise<{
  outputPath: string
  durationSec: number
  thumbnailPath: string | null
}> {
  // Always encode real storyboard stills. VIDEO_RENDER_MOCK only lightens encode settings —
  // never substitute a black lavfi stub for a finished movie.
  if (!input.scenes.length || input.scenes.some((s) => !s.imageUrl?.trim())) {
    throw new Error(
      'MP4 export requires a storyboard image for every scene. Regenerate missing images, then retry.'
    )
  }

  const mockLite = process.env.VIDEO_RENDER_MOCK === 'true'
  const encodeThreads = resolveFfmpegThreadCount({ mock: mockLite })
  const encodePreset = resolveFfmpegX264Preset({ mock: mockLite })
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-render-'))
  try {
    const segmentPaths: string[] = []
    const scaledScenes = clampSceneDurationsToTarget(
      input.scenes.map((s) => ({ ...s, duration: s.durationSec })),
      computeRenderTotalSec(input.scenes.map((s) => ({ duration: s.durationSec }))),
      { maxPerScene: 12 }
    )
    let totalDuration = 0

    for (let i = 0; i < scaledScenes.length; i++) {
      const scene = scaledScenes[i]
      const dur = Math.max(2, Math.min(12, scene.duration))
      totalDuration += dur
      const imgExt = extFromUrl(scene.imageUrl, '.jpg')
      const imgPath = path.join(workDir, `scene_${i}${imgExt}`)
      await downloadToFile(scene.imageUrl, imgPath)

      const segPath = path.join(workDir, `seg_${i}.mp4`)
      const frames = Math.round(dur * FPS)
      const vf = [
        `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`,
        `crop=${WIDTH}:${HEIGHT}`,
        `zoompan=z='min(zoom+0.0008,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${WIDTH}x${HEIGHT}:fps=${FPS}`,
      ].join(',')

      await runFfmpeg(
        [
          '-y',
          '-loop',
          '1',
          '-i',
          imgPath,
          '-vf',
          vf,
          '-t',
          String(dur),
          ...buildLibx264OutputArgs({ preset: encodePreset, threads: encodeThreads, fps: FPS }),
          segPath,
        ],
        { sceneIndex: i + 1, threads: encodeThreads, preset: encodePreset }
      )
      segmentPaths.push(segPath)
    }

    const concatList = path.join(workDir, 'concat.txt')
    const listBody = segmentPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n')
    await fs.writeFile(concatList, listBody)

    const mergedVideo = path.join(workDir, 'merged.mp4')
    await runFfmpeg([
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatList,
      '-c',
      'copy',
      mergedVideo,
    ])

    const finalPath = input.outputPath
    await ensureDir(path.dirname(finalPath))

    const args = ['-y', '-i', mergedVideo]
    if (input.audioPath) {
      args.push('-i', input.audioPath)
    }

    const burnSubtitles = input.burnSubtitles === true && input.subtitles.length > 0
    if (burnSubtitles) {
      const srtPath = path.join(workDir, 'subs.srt')
      await fs.writeFile(srtPath, segmentsToSrt(input.subtitles), 'utf8')
      const srtForFilter = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
      args.push(
        '-vf',
        `subtitles='${srtForFilter}':force_style='FontName=Arial,FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=80'`
      )
    }
    args.push(...buildLibx264OutputArgs({ preset: encodePreset, threads: encodeThreads, fps: FPS }))

    if (input.audioPath) {
      args.push('-c:a', 'aac', '-b:a', '192k', '-shortest')
    } else {
      args.push('-an')
    }

    args.push('-t', String(MAX_VIDEO_DURATION_SEC), finalPath)
    await runFfmpeg(args)

    const thumbWork = path.join(workDir, 'thumb.jpg')
    const thumbOut = path.join(path.dirname(finalPath), 'thumb.jpg')
    await runFfmpeg(['-y', '-i', finalPath, '-vframes', '1', '-q:v', '2', thumbWork]).catch(
      () => null
    )
    let thumbnailPath: string | null = null
    try {
      await fs.access(thumbWork)
      await fs.copyFile(thumbWork, thumbOut)
      thumbnailPath = thumbOut
    } catch {
      thumbnailPath = null
    }

    return {
      outputPath: finalPath,
      durationSec: Math.min(totalDuration, MAX_VIDEO_DURATION_SEC),
      thumbnailPath,
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/**
 * Dev shortcut when VIDEO_RENDER_MOCK=true — still encodes real storyboard stills
 * (Ken Burns slideshow + optional voice). Never a black stub.
 */
export async function renderMockMp4(input: RenderPipelineInput): Promise<{
  outputPath: string
  durationSec: number
  thumbnailPath: string | null
}> {
  if (!resolveFfmpegPath()) {
    throw new Error('VIDEO_RENDER_MOCK requires ffmpeg-static or FFMPEG_PATH')
  }
  const { width, height } = resolveMockRenderResolution()
  const threads = resolveFfmpegThreadCount({ mock: true })
  const preset = resolveFfmpegX264Preset({ mock: true })
  const dur = resolveMockRenderDurationSec(
    input.scenes.reduce((s, sc) => s + Math.max(2, sc.durationSec), 0) || 8
  )
  logMockRender({
    VIDEO_RENDER_MOCK: true,
    rendererUsed: 'renderFacelessMp4',
    encoderUsed: 'libx264',
    threads,
    preset,
    resolution: `${width}x${height}`,
    durationSec: dur,
  })
  return renderFacelessMp4(input)
}
