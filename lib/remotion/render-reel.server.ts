import 'server-only'

// Vercel NFT only ships files with static import chains; Remotion bundle() reads these from disk.
import '@/lib/remotion/compositions/Root'
import '@/lib/remotion/compositions/ReelComposition'
import '@/lib/remotion/compositions/MugteeComposition'
import '@/lib/remotion/compositions/ReelScene'
import '@/lib/remotion/compositions/ReelParticleOverlay'
import '@/lib/remotion/compositions/ThumbnailComposition'

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { bundle, type WebpackOverrideFn } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  clampSceneDurationsToTarget,
  computeRenderTotalSec,
} from '@/lib/cinematic/scene-duration'
import { downloadToFile, ensureDir, extFromUrl } from '@/lib/video/download-asset'
import { isHttpUrl, localPathToDataUrl } from '@/lib/remotion/local-asset-url'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import { REEL_COMPOSITION_ID, REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from '@/lib/remotion/compositions/constants'
import {
  buildExportCaptionTracks,
  resolveExportCaptionStyle,
} from '@/lib/remotion/build-export-captions'
import { generateReelThumbnail } from '@/lib/remotion/generate-reel-thumbnail.server'
import { buildReelSceneInput } from '@/lib/motion/apply-scene-motion'
import type { SceneMotionMap } from '@/lib/motion/motion-presets'
import type { ReelCompositionProps, ReelSceneInput } from '@/lib/remotion/compositions/types'
import {
  assertAllScenesHaveExportImages,
  findScenesMissingExportImages,
  missingScenesExportMessage,
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
} from '@/lib/export/scene-export-validation'
import { refreshStoryboardUrl } from '@/lib/storyboard/storyboard-url-service.server'
import {
  logPipelineStepComplete,
  logPipelineStepError,
  logPipelineStepStart,
} from '@/lib/cinematic/generation-logger'
import { remotionCheckpoint } from '@/lib/export/export-api-checkpoints.server'
import {
  estimateRemotionRenderMemory,
  logRemotionRenderDiagnostics,
  resolveDisallowParallelEncoding,
  resolveOffthreadVideoCacheBytes,
  resolveRemotionConcurrency,
} from '@/lib/remotion/render-settings.server'
import { mp4RenderLog } from '@/lib/export/mp4-render-log.server'
import {
  renderPipelineError,
  renderPipelineLog,
} from '@/lib/export/render-pipeline-log.server'

let cachedBundleLocation: string | null = null
let bundlePromise: Promise<string> | null = null

/** Remotion's bundler does not read tsconfig paths — mirror @/* aliases for composition imports. */
const remotionWebpackOverride: WebpackOverrideFn = (config) => {
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
    remotionCheckpoint('bundle_start', { entry: 'lib/remotion/compositions/index.ts' })
    const entry = path.join(process.cwd(), 'lib', 'remotion', 'compositions', 'index.ts')
    bundlePromise = bundle({
      entryPoint: entry,
      webpackOverride: remotionWebpackOverride,
    }).then((location) => {
      cachedBundleLocation = location
      remotionCheckpoint('bundle_done', { serveUrl: location })
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
  hook?: string
  niche?: string
  projectId?: string | null
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
    logPipelineStepStart('export', null, { phase: 'remotion_download_assets', sceneCount: timedScenes.length })

    const reelScenes: ReelSceneInput[] = []
    let thumbnailLocalPath: string | null = null
    let dataUrlAssetCount = 0
    let httpAssetCount = 0
    for (let i = 0; i < timedScenes.length; i++) {
      const scene = timedScenes[i]
      let imageUrl =
        resolveSceneExportImageUrl(scene)?.trim() ?? scene.imageUrl?.trim() ?? ''
      if (!imageUrl) {
        const assetPath = resolveSceneExportAssetPath(scene)
        if (assetPath) {
          imageUrl = (await refreshStoryboardUrl(assetPath))?.trim() ?? ''
        }
      }
      if (!imageUrl) {
        const missing = findScenesMissingExportImages(timedScenes)
        logPipelineStepError('export', null, missingScenesExportMessage(missing), {
          sceneIndex: i + 1,
          sceneId: scene.id,
        })
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
      if (isHttpUrl(imageSrc)) httpAssetCount += 1
      else dataUrlAssetCount += 1

      reelScenes.push(
        buildReelSceneInput(scene, i, {
          imageSrc,
          caption: '',
          sceneMotion: input.sceneMotion,
          totalScenes: timedScenes.length,
        })
      )
    }

    const durationSecEstimate = reelScenes.reduce((sum, s) => sum + s.durationSec, 0)
    const captionStyle = resolveExportCaptionStyle({
      niche: input.niche,
      hook: input.hook,
      tone: input.title,
    })
    const { tracks: captionTracks, speechRanges } = buildExportCaptionTracks({
      scenes: timedScenes,
      totalDurationSec: durationSecEstimate,
      fallbackText: input.hook ?? input.title,
      captionStyle,
      title: input.title,
    })

    mp4RenderLog(2, 'timeline built', {
      projectId: input.projectId,
      sceneCount: reelScenes.length,
      durationSec: durationSecEstimate,
      fps: REEL_FPS,
      resolution: `${REEL_WIDTH}x${REEL_HEIGHT}`,
      captionTrackCount: captionTracks.length,
    })

    mp4RenderLog(3, 'scene media prepared', {
      projectId: input.projectId,
      sceneCount: reelScenes.length,
      assetsViaUrl: httpAssetCount,
      assetsViaBase64: dataUrlAssetCount,
    })

    let voiceAudioSrc: string | null = null
    if (input.voiceUrl?.trim()) {
      const ext = extFromUrl(input.voiceUrl, '.mp3')
      const voicePath = path.join(workDir, `voice${ext}`)
      await downloadToFile(input.voiceUrl, voicePath)
      voiceAudioSrc = isHttpUrl(input.voiceUrl)
        ? input.voiceUrl.trim()
        : await localPathToDataUrl(voicePath)
      if (voiceAudioSrc.startsWith('data:')) dataUrlAssetCount += 1
      else httpAssetCount += 1
    }

    let musicAudioSrc: string | null = null
    if (input.musicUrl?.trim()) {
      const ext = extFromUrl(input.musicUrl, '.mp3')
      const musicPath = path.join(workDir, `music${ext}`)
      await downloadToFile(input.musicUrl, musicPath)
      musicAudioSrc = isHttpUrl(input.musicUrl)
        ? input.musicUrl.trim()
        : await localPathToDataUrl(musicPath)
      if (musicAudioSrc.startsWith('data:')) dataUrlAssetCount += 1
      else httpAssetCount += 1
    }

    mp4RenderLog(4, 'audio merged into composition', {
      projectId: input.projectId,
      hasVoice: Boolean(voiceAudioSrc),
      hasMusic: Boolean(musicAudioSrc),
      voiceUrl: input.voiceUrl,
      musicUrl: input.musicUrl ?? null,
      speechRangeCount: speechRanges.length,
    })

    const compositionProps: ReelCompositionProps = {
      title: input.title,
      scenes: reelScenes,
      voiceAudioSrc,
      musicAudioSrc,
      captionTracks,
      speechRanges,
    }

    input.onProgress?.('Rendering reel with Remotion…', 40)

    const serveUrl = await getServeUrl()
    remotionCheckpoint('composition_lookup', { compositionId: REEL_COMPOSITION_ID })
    let composition
    try {
      composition = await selectComposition({
        serveUrl,
        id: REEL_COMPOSITION_ID,
        inputProps: compositionProps,
      })
      renderPipelineLog('REMOTION_COMPOSITION', {
        projectId: input.projectId,
        compositionId: REEL_COMPOSITION_ID,
        serveUrl,
        durationInFrames: composition.durationInFrames,
        fps: composition.fps,
        width: composition.width,
        height: composition.height,
        sceneCount: reelScenes.length,
        durationSec: durationSecEstimate,
        audioExists: Boolean(voiceAudioSrc),
        hasMusic: Boolean(musicAudioSrc),
        captionTrackCount: captionTracks.length,
        propsSerialized: true,
        status: 'loaded',
      })
      remotionCheckpoint('composition_found', {
        compositionId: REEL_COMPOSITION_ID,
        durationInFrames: composition.durationInFrames,
        fps: composition.fps,
      })
    } catch (compErr) {
      renderPipelineError('REMOTION_COMPOSITION', compErr, {
        projectId: input.projectId,
        compositionId: REEL_COMPOSITION_ID,
        serveUrl,
        sceneCount: reelScenes.length,
        durationSec: durationSecEstimate,
        audioExists: Boolean(voiceAudioSrc),
        function: 'selectComposition',
        file: 'lib/remotion/render-reel.server.ts',
      })
      remotionCheckpoint('composition_missing', {
        compositionId: REEL_COMPOSITION_ID,
        error: compErr instanceof Error ? compErr.message : String(compErr),
      })
      throw compErr
    }

    const concurrency = resolveRemotionConcurrency()
    const disallowParallelEncoding = resolveDisallowParallelEncoding()
    const offthreadVideoCacheSizeInBytes = resolveOffthreadVideoCacheBytes()
    const memoryEstimate = estimateRemotionRenderMemory({
      durationInFrames: composition.durationInFrames,
      concurrency,
      sceneCount: reelScenes.length,
      parallelEncodingDisabled: disallowParallelEncoding,
      dataUrlAssetCount,
      httpAssetCount,
    })
    logRemotionRenderDiagnostics(memoryEstimate)
    mp4RenderLog(5, 'starting Remotion renderMedia', {
      projectId: input.projectId,
      outputPath: input.outputPath,
      concurrency,
      disallowParallelEncoding,
      fps: REEL_FPS,
      resolution: `${REEL_WIDTH}x${REEL_HEIGHT}`,
      sceneCount: reelScenes.length,
      durationSec: durationSecEstimate,
    })
    remotionCheckpoint('render_media_start', {
      ...memoryEstimate,
      outputPath: input.outputPath,
      concurrency,
      disallowParallelEncoding,
      offthreadVideoCacheSizeInBytes,
    })
    renderPipelineLog('REMOTION_RENDER_START', {
      projectId: input.projectId,
      frameCount: composition.durationInFrames,
      sceneCount: reelScenes.length,
      duration: durationSecEstimate,
      audioExists: Boolean(voiceAudioSrc),
      outputPath: input.outputPath,
      concurrency,
      status: 'renderMedia',
    })

    try {
      await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: input.outputPath,
      inputProps: compositionProps,
      imageFormat: 'jpeg',
      jpegQuality: 90,
      concurrency,
      disallowParallelEncoding,
      offthreadVideoCacheSizeInBytes,
      chromiumOptions: {
        enableMultiProcessOnLinux: false,
      },
      onStart: ({ frameCount, parallelEncoding, resolvedConcurrency }) => {
        console.info('[REMOTION_RENDER] onStart', {
          frameCount,
          parallelEncoding,
          resolvedConcurrency,
        })
      },
      onProgress: ({ progress }) => {
        const pct = 40 + Math.round(progress * 50)
        input.onProgress?.('Rendering reel…', pct)
      },
    })
    } catch (renderErr) {
      renderPipelineError('REMOTION_RENDER_COMPLETE', renderErr, {
        projectId: input.projectId,
        outputPath: input.outputPath,
        function: 'renderMedia',
        file: 'lib/remotion/render-reel.server.ts',
        frameCount: composition.durationInFrames,
        sceneCount: reelScenes.length,
      })
      throw renderErr
    }

    const durationSec = reelScenes.reduce((sum, s) => sum + s.durationSec, 0)
    input.onProgress?.('Reel encode complete', 95)
    renderPipelineLog('REMOTION_RENDER_COMPLETE', {
      projectId: input.projectId,
      outputPath: input.outputPath,
      duration: durationSec,
      frameCount: composition.durationInFrames,
      status: 'complete',
    })
    mp4RenderLog(5, 'Remotion render complete', {
      projectId: input.projectId,
      outputPath: input.outputPath,
      durationSec,
      fps: REEL_FPS,
      resolution: `${REEL_WIDTH}x${REEL_HEIGHT}`,
    })
    remotionCheckpoint('render_media_done', { durationSec, outputPath: input.outputPath })
    logPipelineStepComplete('export', null, { phase: 'remotion_render_done', durationSec })

    let finalThumbnailPath = thumbnailLocalPath
    if (thumbnailLocalPath && reelScenes[0]?.imageSrc) {
      try {
        const thumbOut = path.join(workDir, 'thumbnail.jpg')
        await generateReelThumbnail({
          serveUrl,
          imageSrc: reelScenes[0].imageSrc,
          title: input.title,
          hook: input.hook,
          outputPath: thumbOut,
        })
        finalThumbnailPath = thumbOut
        mp4RenderLog(6, 'thumbnail.jpg generated', {
          projectId: input.projectId,
          outputPath: thumbOut,
          resolution: `${REEL_WIDTH}x${REEL_HEIGHT}`,
        })
      } catch (thumbErr) {
        mp4RenderLog(6, 'thumbnail generation fallback to scene still', {
          projectId: input.projectId,
          error: thumbErr instanceof Error ? thumbErr.message : String(thumbErr),
        })
      }
    }

    mp4RenderLog(6, 'output saved', {
      projectId: input.projectId,
      outputPath: input.outputPath,
      durationSec,
      voiceUrl: input.voiceUrl,
      musicUrl: input.musicUrl ?? null,
      thumbnailPath: finalThumbnailPath,
    })

    return {
      outputPath: input.outputPath,
      durationSec,
      thumbnailPath: finalThumbnailPath,
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
