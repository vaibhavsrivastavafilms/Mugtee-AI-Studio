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

export const WIDTH = 1080
export const HEIGHT = 1920
export const FPS = 30

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = resolveFfmpegPath()
    if (!bin) {
      reject(new Error('FFmpeg binary not found. Install ffmpeg-static or set FFMPEG_PATH.'))
      return
    }
    const command = `${bin} ${args.join(' ')}`
    renderPipelineLog('FFMPEG_START', { command: command.slice(0, 500), status: 'spawn' })
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
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
  if (process.env.VIDEO_RENDER_MOCK === 'true') {
    return renderMockMp4(input)
  }

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

      await runFfmpeg([
        '-y',
        '-loop',
        '1',
        '-i',
        imgPath,
        '-vf',
        vf,
        '-t',
        String(dur),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-r',
        String(FPS),
        segPath,
      ])
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
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS))

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

/** Dev-only: VIDEO_RENDER_MOCK=true writes a minimal valid MP4 via ffmpeg color source. */
export async function renderMockMp4(input: RenderPipelineInput): Promise<{
  outputPath: string
  durationSec: number
  thumbnailPath: string | null
}> {
  const bin = resolveFfmpegPath()
  if (!bin) {
    throw new Error('VIDEO_RENDER_MOCK requires ffmpeg-static or FFMPEG_PATH')
  }
  await ensureDir(path.dirname(input.outputPath))
  const ciSmoke = process.env.CI_QUICK_CUT_SMOKE === 'true'
  const perSceneMinSec = ciSmoke ? 1 : 2
  const minTotalSec = ciSmoke
    ? Number(process.env.CI_SMOKE_MP4_SECONDS || 2)
    : 15
  const rawTotal =
    input.scenes.reduce((s, sc) => s + Math.max(perSceneMinSec, sc.durationSec), 0) ||
    (ciSmoke ? minTotalSec : 45)
  const dur = Math.min(MAX_VIDEO_DURATION_SEC, Math.max(minTotalSec, rawTotal))
  renderPipelineLog('FFMPEG_START', {
    outputPath: input.outputPath,
    duration: dur,
    mock: true,
    status: 'mock_encode',
  })
  await runFfmpeg([
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${WIDTH}x${HEIGHT}:d=${dur}`,
    '-f',
    'lavfi',
    '-i',
    'anullsrc=r=44100:cl=mono',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    '-t',
    String(dur),
    input.outputPath,
  ])
  const stat = await fs.stat(input.outputPath).catch(() => null)
  renderPipelineLog('FFMPEG_OUTPUT', {
    outputPath: input.outputPath,
    size: stat?.size ?? 0,
    duration: dur,
    codec: 'h264',
    status: stat && stat.size > 0 ? 'valid' : 'empty',
  })
  return { outputPath: input.outputPath, durationSec: dur, thumbnailPath: null }
}
