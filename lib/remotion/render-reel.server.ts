import 'server-only'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  clampSceneDurationsToTarget,
  computeRenderTotalSec,
} from '@/lib/cinematic/scene-duration'
import { downloadToFile, ensureDir, extFromUrl } from '@/lib/video/download-asset'
import { isHttpUrl, localPathToDataUrl } from '@/lib/remotion/local-asset-url'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import { REEL_COMPOSITION_ID, REEL_FPS } from '@/lib/remotion/compositions/constants'
import { buildReelSceneInput } from '@/lib/motion/apply-scene-motion'
import type { SceneMotionMap } from '@/lib/motion/motion-presets'
import type { ReelCompositionProps, ReelSceneInput } from '@/lib/remotion/compositions/types'
import {
  assertAllScenesHaveExportImages,
  findScenesMissingExportImages,
  missingScenesExportMessage,
} from '@/lib/export/scene-export-validation'

let cachedBundleLocation: string | null = null
let bundlePromise: Promise<string> | null = null

/** Remotion's bundler does not read tsconfig paths — mirror @/* aliases for composition imports. */
function remotionWebpackOverride<T extends { resolve?: { alias?: Record<string, string> } }>(
  config: T
): T {
  const root = process.cwd()
  const alias = {
    ...(typeof config.resolve?.alias === 'object' && !Array.isArray(config.resolve.alias)
      ? config.resolve.alias
      : {}),
    '@/lib': path.join(root, 'lib'),
    '@/components': path.join(root, 'components'),
    '@/app': path.join(root, 'app'),
    '@/stores': path.join(root, 'stores'),
    '@/hooks': path.join(root, 'hooks'),
    '@/types': path.join(root, 'types'),
    '@': path.join(root, 'src'),
  }
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias,
    },
  }
}

async function getServeUrl(): Promise<string> {
  if (cachedBundleLocation) return cachedBundleLocation
  if (!bundlePromise) {
    const entry = path.join(process.cwd(), 'lib', 'remotion', 'compositions', 'index.ts')
    bundlePromise = bundle({
      entryPoint: entry,
      webpackOverride: remotionWebpackOverride,
    }).then((location) => {
      cachedBundleLocation = location
      return location
    })
  }
  return bundlePromise
}

export type RenderRemotionReelInput = {
  scenes: GeneratedScene[]
  voiceUrl: string | null
  musicUrl?: string | null
  title: string
  outputPath: string
  sceneMotion?: SceneMotionMap | null
  onProgress?: (label: string, percent: number) => void
}

export async function renderRemotionReel(
  input: RenderRemotionReelInput
): Promise<{ outputPath: string; durationSec: number; thumbnailPath: string | null }> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-remotion-'))
  await ensureDir(workDir)

  try {
    input.onProgress?.('Assembling film assets…', 15)

    const timedScenes = clampSceneDurationsToTarget(
      input.scenes.filter((s) => s.description || s.visualPrompt || s.title),
      computeRenderTotalSec(input.scenes)
    )

    assertAllScenesHaveExportImages(timedScenes)

    const reelScenes: ReelSceneInput[] = []
    let thumbnailLocalPath: string | null = null
    for (let i = 0; i < timedScenes.length; i++) {
      const scene = timedScenes[i]
      const imageUrl = scene.imageUrl?.trim()
      if (!imageUrl) {
        const missing = findScenesMissingExportImages(timedScenes)
        throw new Error(missingScenesExportMessage(missing))
      }
      const ext = extFromUrl(imageUrl, '.jpg')
      const localImage = path.join(workDir, `scene_${i}${ext}`)
      try {
        await downloadToFile(imageUrl, localImage)
      } catch (err) {
        const sceneNum = i + 1
        const detail = err instanceof Error ? err.message : 'download failed'
        throw new Error(
          `Cannot export reel — scene ${sceneNum} image could not be loaded (${detail}). Regenerate scene ${sceneNum}, then try export again.`
        )
      }
      if (i === 0) thumbnailLocalPath = localImage

      const imageSrc = isHttpUrl(imageUrl)
        ? imageUrl
        : await localPathToDataUrl(localImage)

      reelScenes.push(
        buildReelSceneInput(scene, i, {
          imageSrc,
          caption: '',
          sceneMotion: input.sceneMotion,
          totalScenes: timedScenes.length,
        })
      )
    }

    let voiceAudioSrc: string | null = null
    if (input.voiceUrl?.trim()) {
      const ext = extFromUrl(input.voiceUrl, '.mp3')
      const voicePath = path.join(workDir, `voice${ext}`)
      await downloadToFile(input.voiceUrl, voicePath)
      voiceAudioSrc = isHttpUrl(input.voiceUrl)
        ? input.voiceUrl.trim()
        : await localPathToDataUrl(voicePath)
    }

    let musicAudioSrc: string | null = null
    if (input.musicUrl?.trim()) {
      const ext = extFromUrl(input.musicUrl, '.mp3')
      const musicPath = path.join(workDir, `music${ext}`)
      await downloadToFile(input.musicUrl, musicPath)
      musicAudioSrc = isHttpUrl(input.musicUrl)
        ? input.musicUrl.trim()
        : await localPathToDataUrl(musicPath)
    }

    const compositionProps: ReelCompositionProps = {
      title: '',
      scenes: reelScenes,
      voiceAudioSrc,
      musicAudioSrc,
      voiceVolume: 1,
      musicVolume: musicAudioSrc ? 0.16 : 0,
    }

    input.onProgress?.('Rendering reel with Remotion…', 40)

    const serveUrl = await getServeUrl()
    const composition = await selectComposition({
      serveUrl,
      id: REEL_COMPOSITION_ID,
      inputProps: compositionProps,
    })

    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: input.outputPath,
      inputProps: compositionProps,
      imageFormat: 'jpeg',
      jpegQuality: 90,
      onProgress: ({ progress }) => {
        const pct = 40 + Math.round(progress * 50)
        input.onProgress?.('Rendering reel…', pct)
      },
    })

    const durationSec = reelScenes.reduce((sum, s) => sum + s.durationSec, 0)
    input.onProgress?.('Reel encode complete', 95)

    return {
      outputPath: input.outputPath,
      durationSec,
      thumbnailPath: thumbnailLocalPath,
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

export function isRemotionRenderAvailable(): boolean {
  return isVideoRenderEnabled()
}

/** Dev stub when VIDEO_RENDER_MOCK=true — copies first scene image metadata only. */
export async function renderRemotionReelMock(input: {
  outputPath: string
  durationSec?: number
}): Promise<{ outputPath: string; durationSec: number; thumbnailPath: string | null }> {
  const { renderMockMp4 } = await import('@/lib/video/render-pipeline')
  const result = await renderMockMp4({
    scenes: [{ id: 'mock', imageUrl: 'https://placehold.co/1080x1920', durationSec: input.durationSec ?? 8 }],
    audioPath: null,
    subtitles: [],
    outputPath: input.outputPath,
  })
  return result
}

export { REEL_FPS }
