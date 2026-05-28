import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import type { RenderSceneInput, SubtitleSegment } from '@/lib/video/types'
import { resolveFfmpegPath } from '@/lib/video/ffmpeg-path'
import { downloadToFile, ensureDir, extFromUrl } from '@/lib/video/download-asset'
import { segmentsToSrt } from '@/lib/video/subtitles'

const WIDTH = 1080
const HEIGHT = 1920
const FPS = 30

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = resolveFfmpegPath()
    if (!bin) {
      reject(new Error('FFmpeg binary not found. Install ffmpeg-static or set FFMPEG_PATH.'))
      return
    }
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.slice(-1200) || `ffmpeg exited with code ${code}`))
    })
  })
}

export type RenderPipelineInput = {
  scenes: RenderSceneInput[]
  audioPath: string | null
  subtitles: SubtitleSegment[]
  outputPath: string
  crossfadeSec?: number
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
    let totalDuration = 0

    for (let i = 0; i < input.scenes.length; i++) {
      const scene = input.scenes[i]
      const dur = Math.max(2, Math.min(12, scene.durationSec))
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

    const srtPath = path.join(workDir, 'subs.srt')
    await fs.writeFile(srtPath, segmentsToSrt(input.subtitles), 'utf8')

    const srtForFilter = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
    const finalPath = input.outputPath
    await ensureDir(path.dirname(finalPath))

    const args = ['-y', '-i', mergedVideo]
    if (input.audioPath) {
      args.push('-i', input.audioPath)
    }

    const vfParts = [
      `subtitles='${srtForFilter}':force_style='FontName=Arial,FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=80'`,
    ]
    args.push('-vf', vfParts.join(','))
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS))

    if (input.audioPath) {
      args.push('-c:a', 'aac', '-b:a', '192k', '-shortest')
    } else {
      args.push('-an')
    }

    args.push(finalPath)
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
      durationSec: totalDuration,
      thumbnailPath,
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/** Dev-only: VIDEO_RENDER_MOCK=true writes a minimal valid MP4 via ffmpeg color source. */
async function renderMockMp4(input: RenderPipelineInput): Promise<{
  outputPath: string
  durationSec: number
  thumbnailPath: string | null
}> {
  const bin = resolveFfmpegPath()
  if (!bin) {
    throw new Error('VIDEO_RENDER_MOCK requires ffmpeg-static or FFMPEG_PATH')
  }
  await ensureDir(path.dirname(input.outputPath))
  const dur = Math.min(60, Math.max(30, input.scenes.reduce((s, sc) => s + sc.durationSec, 0) || 45))
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
  return { outputPath: input.outputPath, durationSec: dur, thumbnailPath: null }
}
