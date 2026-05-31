import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { RenderSceneInput, SubtitleSegment } from '@/lib/video/types'
import { generateRunwayVideo } from '@/lib/ai/runway-video'
import { downloadToFile, ensureDir } from '@/lib/video/download-asset'
import { segmentsToSrt } from '@/lib/video/subtitles'
import {
  clampSceneDurationsToTarget,
  computeRenderTotalSec,
} from '@/lib/cinematic/scene-duration'
import { MAX_VIDEO_DURATION_SEC } from '@/lib/workspace/validation'
import { FPS, HEIGHT, runFfmpeg, WIDTH } from '@/lib/video/render-pipeline'

export type RenderRunwayPipelineInput = {
  scenes: RenderSceneInput[]
  motionPrompts?: string[]
  audioPath: string | null
  subtitles: SubtitleSegment[]
  outputPath: string
  onSceneProgress?: (index: number, total: number, label: string) => void
  /** When true, burn subtitle segments into the exported video. Defaults to off. */
  burnSubtitles?: boolean
}

function sceneMotionPrompt(scene: RenderSceneInput, motion?: string): string {
  const parts = [motion?.trim(), scene.title?.trim()].filter(Boolean)
  if (parts.length > 0) return parts.join('. ').slice(0, 900)
  return 'Subtle cinematic camera motion, vertical social video, smooth movement'
}

/** Generate one Runway clip per scene, then assemble voice + subtitles with FFmpeg. */
export async function renderRunwayMp4(input: RenderRunwayPipelineInput): Promise<{
  outputPath: string
  durationSec: number
  thumbnailPath: string | null
  provider: 'runway'
}> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-runway-'))
  try {
    const scaledScenes = clampSceneDurationsToTarget(
      input.scenes.map((s) => ({ ...s, duration: s.durationSec })),
      computeRenderTotalSec(input.scenes.map((s) => ({ duration: s.durationSec }))),
      { maxPerScene: 10 }
    )

    const segmentPaths: string[] = []
    let totalDuration = 0

    for (let i = 0; i < scaledScenes.length; i++) {
      const scene = scaledScenes[i]!
      const dur = Math.max(2, Math.min(10, scene.duration))
      totalDuration += dur

      input.onSceneProgress?.(
        i + 1,
        scaledScenes.length,
        `Runway scene ${i + 1} of ${scaledScenes.length}…`
      )

      const { videoUrl } = await generateRunwayVideo({
        promptImage: scene.imageUrl,
        promptText: sceneMotionPrompt(scene, input.motionPrompts?.[i]),
        durationSec: dur,
        onProgress: (label) =>
          input.onSceneProgress?.(i + 1, scaledScenes.length, label),
      })

      const clipPath = path.join(workDir, `runway_${i}.mp4`)
      await downloadToFile(videoUrl, clipPath)

      const normalizedPath = path.join(workDir, `seg_${i}.mp4`)
      await runFfmpeg([
        '-y',
        '-i',
        clipPath,
        '-vf',
        [
          `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`,
          `crop=${WIDTH}:${HEIGHT}`,
          `fps=${FPS}`,
        ].join(','),
        '-t',
        String(dur),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-an',
        normalizedPath,
      ])
      segmentPaths.push(normalizedPath)
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
    if (input.audioPath) args.push('-i', input.audioPath)

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
      provider: 'runway',
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
