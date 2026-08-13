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
import { downloadSceneImageForRender } from '@/lib/export/project-asset-download.server'
import { resolveVoiceAudioPathForRender } from '@/lib/export/render-audio-fallback.server'
import { localPathToDataUrl } from '@/lib/remotion/local-asset-url'
import {
  classifyRenderMediaSource,
  sanitizeRenderSessionKey,
  sanitizeRenderUrlForLog,
  toRemotionBundlePublicSrc,
} from '@/lib/v7/render-media-validation.server'
import { showOnScreenText } from '@/lib/remotion/show-on-screen-text.server'
import { validateLocalVideoFile } from '@/lib/v7/providers/video-provider-base.server'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import { REEL_COMPOSITION_ID, REEL_FPS } from '@/lib/remotion/compositions/constants'
import { resolveReelDimensions } from '@/lib/remotion/reel-dimensions.core'
import {
  buildExportCaptionTracks,
  resolveExportCaptionStyle,
} from '@/lib/remotion/build-export-captions'
import { generateReelThumbnail } from '@/lib/remotion/generate-reel-thumbnail.server'
import { buildReelSceneInput } from '@/lib/motion/apply-scene-motion'
import { ensureCinematicMotionMap } from '@/lib/production-os/v3/camera-director'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import type { ReelCompositionProps, ReelSceneInput } from '@/lib/remotion/compositions/types'
import {
  assertAllScenesHaveExportImages,
  findScenesMissingExportImages,
  missingScenesExportMessage,
  resolveSceneExportAssetPath,
} from '@/lib/export/scene-export-validation'
import { resolveSceneRenderImageUrl } from '@/lib/export/scene-render-image.server'
import {
  logPipelineStepComplete,
  logPipelineStepError,
  logPipelineStepStart,
} from '@/lib/cinematic/generation-logger'
import { remotionCheckpoint } from '@/lib/export/export-api-checkpoints.server'
import {
  renderPipelineError,
  renderPipelineLog,
} from '@/lib/export/render-pipeline-log.server'
import {
  estimateRemotionRenderMemory,
  logRemotionRenderDiagnostics,
  resolveDisallowParallelEncoding,
  resolveFfmpegThreadCount,
  resolveOffthreadVideoCacheBytes,
  resolveRemotionConcurrency,
  resolveRemotionCrf,
  resolveRemotionDelayRenderTimeoutMs,
  resolveRemotionX264Preset,
} from '@/lib/remotion/render-settings.server'
import { logMemoryTrace } from '@/lib/video/render-memory-trace.server'
import { mp4RenderLog } from '@/lib/export/mp4-render-log.server'

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
      if (!location) throw new Error('Remotion bundle did not return a serve URL')
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
  voiceAssetPath?: string | null
  musicUrl?: string | null
  title: string
  hook?: string
  niche?: string
  projectId?: string | null
  outputPath: string
  sceneMotion?: SceneMotionMap | null
  onProgress?: (
    label: string,
    percent: number,
    meta?: { framesRendered?: number; framesTotal?: number; fps?: number }
  ) => void
  renderWidth?: number
  renderHeight?: number
}

export async function renderRemotionReel(
  input: RenderRemotionReelInput
): Promise<{ outputPath: string; durationSec: number; thumbnailPath: string | null }> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-remotion-'))
  await ensureDir(workDir)

  try {
    const renderWidth = input.renderWidth ?? resolveReelDimensions('9:16').width
    const renderHeight = input.renderHeight ?? resolveReelDimensions('9:16').height

    input.onProgress?.('Assembling film assets…', 15)

    const timedScenes = clampSceneDurationsToTarget(
      input.scenes.filter((s) => s.description || s.visualPrompt || s.title),
      computeRenderTotalSec(input.scenes)
    )

    // Camera Director V3 — every scene gets intentional cinematic motion (never static)
    const cinematicMotion = ensureCinematicMotionMap(timedScenes, input.sceneMotion)

    assertAllScenesHaveExportImages(timedScenes)
    logPipelineStepStart('export', null, { phase: 'remotion_download_assets', sceneCount: timedScenes.length })

    const reelScenes: ReelSceneInput[] = []
    let thumbnailLocalPath: string | null = null
    let dataUrlAssetCount = 0
    let localBundleAssetCount = 0

    const serveUrl = await getServeUrl()
    const renderSessionKey = sanitizeRenderSessionKey(input.projectId ?? path.basename(workDir))
    const renderPublicDir = path.join(serveUrl, 'public', 'mugtee-render', renderSessionKey)
    await fs.mkdir(renderPublicDir, { recursive: true })

    for (let i = 0; i < timedScenes.length; i++) {
      const scene = timedScenes[i]
      const imageUrl = (await resolveSceneRenderImageUrl(scene))?.trim() ?? ''
      const assetPath = resolveSceneExportAssetPath(scene)
      console.info(
        '[IMAGE_UPLOAD_TRACE]',
        JSON.stringify({
          scene: i + 1,
          phase: 'remotion_input',
          remotionInputUrl: imageUrl.includes('pollinations') ? null : imageUrl,
          providerUrl: scene.imageUrl?.includes('pollinations') ? scene.imageUrl : null,
          usesSignedUrl: Boolean(imageUrl && !imageUrl.includes('pollinations.ai')),
          imageAssetPath: assetPath,
        })
      )
      if (!imageUrl) {
        const missing = findScenesMissingExportImages(timedScenes)
        logPipelineStepError('export', null, missingScenesExportMessage(missing), {
          sceneIndex: i + 1,
          sceneId: scene.id,
          imageAssetPath: assetPath,
        })
        throw new Error(missingScenesExportMessage(missing))
      }
      renderPipelineLog('RENDER_PREP', {
        phase: 'scene_download_url',
        sceneIndex: i + 1,
        sceneId: scene.id,
        imageAssetPath: assetPath,
        imageUrl: imageUrl.includes('pollinations') ? '[ephemeral]' : imageUrl,
        status: 'resolved',
      })
      const ext = extFromUrl(imageUrl, '.jpg')
      const localImage = path.join(workDir, `scene_${i}${ext}`)
      try {
        const download = await downloadSceneImageForRender({
          assetPath,
          url: imageUrl,
          destPath: localImage,
        })
        renderPipelineLog('RENDER_PREP', {
          phase: 'scene_download',
          sceneIndex: i + 1,
          sceneId: scene.id,
          imageAssetPath: assetPath,
          method: download.method,
          status: 'downloaded',
        })
      } catch (err) {
        const sceneNum = i + 1
        const detail = err instanceof Error ? err.message : 'download failed'
        throw new Error(
          `Cannot export reel — scene ${sceneNum} image could not be loaded (${detail}). Regenerate scene ${sceneNum}, then try export again.`
        )
      }
      if (i === 0) thumbnailLocalPath = localImage

      // Always feed Remotion local data URLs — remote HTTP hits CORP/COEP in Chromium.
      const imageSrc = await localPathToDataUrl(localImage)
      dataUrlAssetCount += 1

      // Scene video — download from persisted Supabase URL, stage locally for Remotion bundle server.
      // Do NOT pass remote HTTPS URLs (proxy re-download + 20s idle timeout) or data:video URIs.
      let videoSrc: string | null = null
      const sceneVideoUrl = scene.videoUrl?.trim()
      if (sceneVideoUrl) {
        console.info('[render] Scene', i + 1, 'video URL:', sanitizeRenderUrlForLog(sceneVideoUrl))

        const persistedSourceType = classifyRenderMediaSource(sceneVideoUrl)
        if (persistedSourceType === 'DATA_URI') {
          throw new Error(
            `RENDER_MEDIA_SOURCE_INVALID — scene ${i + 1} video must not be a data URI`
          )
        }
        if (persistedSourceType !== 'URL') {
          throw new Error(
            `RENDER_MEDIA_SOURCE_INVALID — scene ${i + 1} persisted video is ${persistedSourceType}`
          )
        }

        const vExt = extFromUrl(sceneVideoUrl, '.mp4')
        const localVideo = path.join(workDir, `scene_${i}_clip${vExt}`)
        await downloadToFile(sceneVideoUrl, localVideo)
        const probe = await validateLocalVideoFile(localVideo)
        if (!probe.valid) {
          throw new Error(
            `Scene ${i + 1} video failed FFprobe before Remotion (${probe.error ?? 'invalid'})`
          )
        }

        const publicFileName = `scene_${i + 1}_clip${vExt}`
        const stagedVideoPath = path.join(renderPublicDir, publicFileName)
        await fs.copyFile(localVideo, stagedVideoPath)
        videoSrc = toRemotionBundlePublicSrc(`mugtee-render/${renderSessionKey}/${publicFileName}`)

        const remotionSourceType = classifyRenderMediaSource(videoSrc)
        console.info('[render] Scene', i + 1, 'source type:', remotionSourceType)
        console.info('[render] Scene', i + 1, 'source:', videoSrc)
        if (remotionSourceType === 'DATA_URI') {
          throw new Error(
            `RENDER_MEDIA_SOURCE_INVALID — scene ${i + 1} Remotion video must not be a data URI`
          )
        }
        if (remotionSourceType !== 'LOCAL_PATH') {
          throw new Error(
            `RENDER_MEDIA_SOURCE_INVALID — scene ${i + 1} Remotion source is ${remotionSourceType}`
          )
        }

        localBundleAssetCount += 1
      }

      reelScenes.push(
        buildReelSceneInput(scene, i, {
          imageSrc,
          videoSrc,
          caption: '',
          sceneMotion: cinematicMotion,
          totalScenes: timedScenes.length,
        })
      )
    }

    const durationSecEstimate = reelScenes.reduce((sum, s) => sum + s.durationSec, 0)
    const onScreenTextEnabled = showOnScreenText()
    let captionTracks: import('@/lib/remotion/reel-caption-layer').ReelCaptionClip[] = []
    let speechRanges: import('@/lib/remotion/build-export-captions').SpeechRange[] = []

    if (onScreenTextEnabled) {
      const captionStyle = resolveExportCaptionStyle({
        niche: input.niche,
        hook: input.hook,
        tone: input.title,
      })
      const built = buildExportCaptionTracks({
        scenes: timedScenes,
        totalDurationSec: durationSecEstimate,
        fallbackText: input.hook ?? input.title,
        captionStyle,
        title: input.title,
      })
      captionTracks = built.tracks
      speechRanges = built.speechRanges
    } else {
      let cursor = 0
      speechRanges = reelScenes.map((scene) => {
        const dur = Math.max(2, scene.durationSec)
        const range = { startSec: cursor, endSec: cursor + dur }
        cursor += dur
        return range
      })
    }

    mp4RenderLog(2, 'timeline built', {
      projectId: input.projectId,
      sceneCount: reelScenes.length,
      durationSec: durationSecEstimate,
      fps: REEL_FPS,
      resolution: `${renderWidth}x${renderHeight}`,
      captionTrackCount: captionTracks.length,
    })

    mp4RenderLog(3, 'scene media prepared', {
      projectId: input.projectId,
      sceneCount: reelScenes.length,
      assetsViaBundlePublic: localBundleAssetCount,
      assetsViaBase64: dataUrlAssetCount,
    })

    const voiceResolved = await resolveVoiceAudioPathForRender({
      workDir,
      voiceUrl: input.voiceUrl,
      voiceAssetPath: input.voiceAssetPath,
      durationSec: durationSecEstimate,
    })
    const voiceAudioSrc = await localPathToDataUrl(voiceResolved.path)
    dataUrlAssetCount += 1

    let musicAudioSrc: string | null = null
    if (input.musicUrl?.trim()) {
      const ext = extFromUrl(input.musicUrl, '.mp3')
      const musicPath = path.join(workDir, `music${ext}`)
      try {
        await downloadToFile(input.musicUrl, musicPath)
        const stat = await fs.stat(musicPath).catch(() => null)
        if (stat && stat.isFile() && stat.size > 0) {
          musicAudioSrc = await localPathToDataUrl(musicPath)
          dataUrlAssetCount += 1
        }
      } catch {
        musicAudioSrc = null
      }
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
      resolution: { width: renderWidth, height: renderHeight },
    }

    input.onProgress?.('Rendering reel with Remotion…', 40)

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
    const x264Preset = resolveRemotionX264Preset()
    const crf = resolveRemotionCrf()
    const ffmpegThreads = resolveFfmpegThreadCount()
    const timeoutInMilliseconds = resolveRemotionDelayRenderTimeoutMs()
    const memoryEstimate = estimateRemotionRenderMemory({
      durationInFrames: composition.durationInFrames,
      concurrency,
      sceneCount: reelScenes.length,
      parallelEncodingDisabled: disallowParallelEncoding,
      dataUrlAssetCount,
      httpAssetCount: localBundleAssetCount,
      width: renderWidth,
      height: renderHeight,
    })
    logRemotionRenderDiagnostics(memoryEstimate)
    logMemoryTrace({
      projectId: input.projectId,
      sceneCount: reelScenes.length,
      resolution: `${renderWidth}x${renderHeight}`,
      fps: REEL_FPS,
      duration: durationSecEstimate,
      estimatedFrames: composition.durationInFrames,
      renderer: 'renderMedia',
      codec: 'h264',
      threads: ffmpegThreads,
      concurrency,
    })
    mp4RenderLog(5, 'starting Remotion renderMedia', {
      projectId: input.projectId,
      outputPath: input.outputPath,
      concurrency,
      disallowParallelEncoding,
      x264Preset,
      crf,
      ffmpegThreads,
      fps: REEL_FPS,
      resolution: `${renderWidth}x${renderHeight}`,
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
      crf,
      x264Preset,
      disallowParallelEncoding,
      offthreadVideoCacheSizeInBytes,
      timeoutInMilliseconds,
      ffmpegOverride: ({ type, args }) => {
        if (type !== 'stitcher') return args
        if (args.some((a) => a === '-threads')) return args
        const idx = args.indexOf('-c:v')
        if (idx === -1) return [...args, '-threads', String(ffmpegThreads)]
        return [...args.slice(0, idx + 2), '-threads', String(ffmpegThreads), ...args.slice(idx + 2)]
      },
      chromiumOptions: {
        enableMultiProcessOnLinux: false,
      },
      onStart: ({ frameCount, parallelEncoding, resolvedConcurrency }) => {
        console.info('[REMOTION_RENDER] onStart', {
          frameCount,
          parallelEncoding,
          resolvedConcurrency,
        })
        input.onProgress?.('🎞 Rendering movie…', 40, {
          framesRendered: 0,
          framesTotal: frameCount,
        })
      },
      onProgress: (event) => {
        const framesTotal = composition.durationInFrames
        const progress = event.progress
        const framesRendered = Math.round(progress * framesTotal)
        const pct = 40 + Math.round(progress * 55)
        input.onProgress?.(
          `🎞 Rendering ${framesRendered} / ${framesTotal} frames`,
          Math.min(95, pct),
          { framesRendered, framesTotal, fps: REEL_FPS }
        )
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
      resolution: `${renderWidth}x${renderHeight}`,
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
          resolution: `${renderWidth}x${renderHeight}`,
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

/**
 * Dev shortcut when VIDEO_RENDER_MOCK=true — FFmpeg Ken Burns from real storyboard stills.
 * Never encodes placehold.co / black stubs.
 */
export async function renderRemotionReelMock(input: {
  outputPath: string
  durationSec?: number
  scenes?: GeneratedScene[]
  voiceUrl?: string | null
  subtitles?: import('@/lib/video/types').SubtitleSegment[]
  musicUrl?: string | null
  sfxTracks?: Array<{ name: string; url: string; startSec?: number }>
}): Promise<{ outputPath: string; durationSec: number; thumbnailPath: string | null }> {
  const scenes = (input.scenes ?? []).filter((s) =>
    Boolean(s.imageUrl?.trim() || s.imageAssetPath?.trim())
  )
  if (scenes.length < 1) {
    throw new Error(
      'MP4 export requires storyboard images. Regenerate images, then retry export.'
    )
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mugtee-mock-reel-'))
  try {
    const renderScenes: { id: string; imageUrl: string; durationSec: number }[] = []
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i]
      const imageUrl = (await resolveSceneRenderImageUrl(scene))?.trim() ?? ''
      const assetPath = resolveSceneExportAssetPath(scene)
      if (!imageUrl && !assetPath) {
        throw new Error(
          `Cannot export reel — scene ${i + 1} is missing a durable storyboard image.`
        )
      }
      const ext = extFromUrl(imageUrl || '.jpg', '.jpg')
      const localImage = path.join(workDir, `scene_${i}${ext}`)
      await downloadSceneImageForRender({
        assetPath,
        url: imageUrl || null,
        destPath: localImage,
      })
      // Faceless encoder expects a fetchable URL — use data URL from local file.
      const dataUrl = await localPathToDataUrl(localImage)
      renderScenes.push({
        id: scene.id,
        imageUrl: dataUrl,
        durationSec: Math.max(2, scene.duration ?? 4),
      })
    }

    const durationSec =
      input.durationSec ??
      renderScenes.reduce((sum, s) => sum + Math.max(2, s.durationSec), 0)
    const voiceResolved = await resolveVoiceAudioPathForRender({
      workDir,
      voiceUrl: input.voiceUrl,
      durationSec,
    })

    const { renderFacelessMp4 } = await import('@/lib/video/render-pipeline')
    const subtitles = input.subtitles ?? []
    return renderFacelessMp4({
      scenes: renderScenes,
      audioPath: voiceResolved.path,
      subtitles,
      outputPath: input.outputPath,
      durationSec,
      burnSubtitles: subtitles.length > 0,
      voiceUrl: input.voiceUrl,
      musicUrl: input.musicUrl ?? null,
      sfxTracks: input.sfxTracks ?? [],
    })
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

export { REEL_FPS }
