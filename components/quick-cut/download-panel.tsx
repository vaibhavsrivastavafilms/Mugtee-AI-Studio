'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Mic,
  Package,
  Share2,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUsage } from '@/lib/usage'
import { downloadMp3File } from '@/lib/quick-cut/download-audio'
import { resolveMp4Download } from '@/lib/quick-cut/resolve-mp4-download.client'
import {
  downloadAllStoryboardImages,
  SCENE_IMAGE_EXPORT_DIMENSIONS,
  slugifyExportBase,
  type SceneImageExportSize,
} from '@/lib/quick-cut/download-scene-image'
import { downloadScriptDoc, downloadScriptTxt } from '@/lib/quick-cut/download-script'
import {
  buildCreatorPackZip,
  triggerCreatorPackDownload,
  type CreatorPackExportResult,
} from '@/lib/quick-cut/creator-pack-export.client'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import {
  ASSET_UNAVAILABLE_MSG,
  EXPORT_EXPIRED_MSG,
  isQuickCutMp4DownloadReady,
  resolveQuickCutExportAssets,
} from '@/lib/quick-cut/asset-availability'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import { trackClientUsage } from '@/lib/usage/plan-limit-toast.client'
import { QuickCutPlatformExportProfiles } from '@/components/quick-cut/platform-export-profiles'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const rowButtonClass =
  'inline-flex min-h-[36px] items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-[0.12em] uppercase transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'

const primaryButtonClass = cn(rowButtonClass, 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90')
const secondaryButtonClass = cn(
  rowButtonClass,
  'border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 hover:bg-gold-500/10'
)
const ghostButtonClass = cn(
  rowButtonClass,
  'border border-white/10 text-luxe/70 hover:text-luxe hover:border-white/20'
)

function DownloadRow({
  icon,
  label,
  hint,
  children,
  'data-recommend-target': recommendTarget,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  children: React.ReactNode
  'data-recommend-target'?: string
}) {
  return (
    <div
      data-recommend-target={recommendTarget}
      className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/80">
          {icon}
          {label}
        </div>
        {hint ? <p className="text-[11px] text-luxe/45 mt-1">{hint}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>
    </div>
  )
}

export function QuickCutDownloadPanel({ className }: { className?: string }) {
  const { isUnlimited } = useUsage()

  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const syncVideoRenderConfig = useQuickCutGenerationStore((s) => s.syncVideoRenderConfig)

  const [downloadingMp4, setDownloadingMp4] = useState(false)
  const [downloadingMp3, setDownloadingMp3] = useState(false)
  const [downloadingImagesFormat, setDownloadingImagesFormat] =
    useState<SceneImageExportSize | null>(null)
  const [assetError, setAssetError] = useState<string | null>(null)
  const pollStartedRef = useRef(false)
  const exportTrackedRef = useRef(false)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const researchReport = useQuickCutGenerationStore((s) => s.researchReport)

  type CreatorPackState = 'idle' | 'preparing' | 'ready' | 'error'
  const [creatorPackState, setCreatorPackState] = useState<CreatorPackState>('idle')
  const [creatorPackProgress, setCreatorPackProgress] = useState(0)
  const [creatorPackResult, setCreatorPackResult] = useState<CreatorPackExportResult | null>(null)

  const trackExportStarted = useCallback(
    (asset: string) => {
      if (exportTrackedRef.current) return
      exportTrackedRef.current = true
      trackEvent(AnalyticsEvents.EXPORT_STARTED, {
        projectId: savedProjectId,
        metadata: { asset },
      })
    },
    [savedProjectId]
  )

  const guardExport = useCallback(async () => trackClientUsage('exports'), [])

  const exportBase = slugifyExportBase(title || 'mugtee-reel', 'mugtee-reel')
  const mp4Name = `${exportBase}.mp4`
  const mp3Name = `${exportBase}-narration.mp3`

  const exportAssets = resolveQuickCutExportAssets({
    title,
    hook,
    script,
    scriptBeats,
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
    isGenerating,
  })
  const hasScript = exportAssets.script
  const hasImages = exportAssets.images
  const hasNarration = exportAssets.narration
  const canCompileMp4 = quickCutCanCompileMp4(scenes, voiceUrl, videoRenderEnabled)
  const mp4DownloadReady = isQuickCutMp4DownloadReady({
    videoUrl,
    videoRenderEnabled,
    exportExpired,
    isRenderingVideo,
    renderPollUrl,
    renderError,
  })
  const hasMp4 = mp4DownloadReady || (canCompileMp4 && !exportExpired)
  const mp4Compiling =
    isRenderingVideo ||
    (videoRenderEnabled && Boolean(renderPollUrl) && !videoUrl && !renderError)

  useEffect(() => {
    void syncVideoRenderConfig()
  }, [syncVideoRenderConfig])

  useEffect(() => {
    if (!videoRenderEnabled) {
      pollStartedRef.current = false
      return
    }
    if (videoUrl || renderError || isRenderingVideo) {
      pollStartedRef.current = false
      return
    }
    if (!canCompileMp4 && !renderPollUrl) {
      pollStartedRef.current = false
      return
    }
    if (pollStartedRef.current) return

    pollStartedRef.current = true
    const run = renderPollUrl ? resumeRenderPoll() : retryVideoRender()
    void run.finally(() => {
      pollStartedRef.current = false
    })
  }, [
    videoRenderEnabled,
    videoUrl,
    renderPollUrl,
    renderError,
    isRenderingVideo,
    canCompileMp4,
    resumeRenderPoll,
    retryVideoRender,
  ])

  const scriptInput = { title, hook, script, scriptBeats, payoff, cta, isUnlimited }

  const handleDownloadTxt = useCallback(async () => {
    if (!(await guardExport())) return
    trackExportStarted('script_txt')
    downloadScriptTxt(scriptInput)
  }, [scriptInput, trackExportStarted, guardExport])

  const handleDownloadDoc = useCallback(() => {
    downloadScriptDoc(scriptInput)
  }, [title, hook, script, scriptBeats, payoff, cta, isUnlimited])

  const handleDownloadImages = useCallback(
    async (exportSize: SceneImageExportSize) => {
      if (downloadingImagesFormat || !hasImages) return
      if (!(await guardExport())) return
      trackExportStarted(`images_${exportSize}`)
      setAssetError(null)
      setDownloadingImagesFormat(exportSize)
      try {
        const count = await downloadAllStoryboardImages(scenes, title || 'mugtee-storyboard', exportSize)
        if (count < 1) throw new Error(ASSET_UNAVAILABLE_MSG)
      } catch (err) {
        const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
        setAssetError(message)
      } finally {
        setDownloadingImagesFormat(null)
      }
    },
    [downloadingImagesFormat, scenes, title, trackExportStarted, hasImages, guardExport]
  )

  const handleDownloadMp3 = useCallback(async () => {
    if (!hasNarration || downloadingMp3) return
    if (!(await guardExport())) return
    trackExportStarted('narration_mp3')
    setAssetError(null)
    setDownloadingMp3(true)
    try {
      await downloadMp3File(voiceUrl!, mp3Name)
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      setAssetError(message)
    } finally {
      setDownloadingMp3(false)
    }
  }, [voiceUrl, mp3Name, downloadingMp3, trackExportStarted, hasNarration, guardExport])

  const handleShareReel = useCallback(async () => {
    if (!videoUrl?.trim()) return
    if (!(await guardExport())) return
    trackExportStarted('video_share')
    try {
      if (navigator.share) {
        await navigator.share({ title: title || 'Mugtee reel', url: videoUrl })
      } else {
        await navigator.clipboard.writeText(videoUrl)
      }
    } catch {
      /* user cancelled share */
    }
  }, [videoUrl, title, trackExportStarted, guardExport])

  const handlePreviewReel = useCallback(() => {
    if (!videoUrl?.trim()) return
    window.open(videoUrl, '_blank', 'noopener,noreferrer')
  }, [videoUrl])

  const handleDownloadMp4 = useCallback(async () => {
    if (downloadingMp4) return
    if (!videoUrl?.trim() && !canCompileMp4 && !savedProjectId) return
    if (!(await guardExport())) return
    trackExportStarted('video_mp4')
    setDownloadingMp4(true)
    try {
      if (videoUrl?.trim() || savedProjectId) {
        await resolveMp4Download({
          projectId: savedProjectId,
          videoUrl,
          filename: mp4Name,
          compileIfNeeded: canCompileMp4 && !videoUrl,
        })
      } else {
        await retryVideoRender()
        const url = useQuickCutGenerationStore.getState().videoUrl
        const err = useQuickCutGenerationStore.getState().renderError
        if (!url) throw new Error(err || 'Video compile failed')
        await resolveMp4Download({
          projectId: savedProjectId,
          videoUrl: url,
          filename: mp4Name,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      const expired = message === EXPORT_EXPIRED_MSG || message.includes('Export job expired')
      useQuickCutGenerationStore.setState({
        renderError: message,
        ...(expired ? { exportExpired: true, videoUrl: null } : {}),
      })
      setAssetError(message)
    } finally {
      setDownloadingMp4(false)
    }
  }, [
    videoUrl,
    mp4Name,
    downloadingMp4,
    trackExportStarted,
    savedProjectId,
    canCompileMp4,
    retryVideoRender,
    guardExport,
  ])

  const handleExportCreatorPack = useCallback(async () => {
    setCreatorPackState('preparing')
    setCreatorPackProgress(0)
    setCreatorPackResult(null)
    setAssetError(null)
    if (!(await guardExport())) {
      setCreatorPackState('idle')
      return
    }
    trackExportStarted('creator_pack')

    try {
      const result = await buildCreatorPackZip(
        {
          title,
          hook,
          script,
          scriptBeats,
          payoff,
          cta,
          scenes,
          voiceUrl,
          researchReport,
          savedProjectId,
          isUnlimited,
          isGenerating,
        },
        ({ progress }) => setCreatorPackProgress(progress)
      )
      setCreatorPackResult(result)
      setCreatorPackState('ready')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create Creator Pack.'
      setAssetError(message)
      setCreatorPackState('error')
    }
  }, [
    title,
    hook,
    script,
    scriptBeats,
    payoff,
    cta,
    scenes,
    voiceUrl,
    researchReport,
    savedProjectId,
    isUnlimited,
    isGenerating,
    trackExportStarted,
  ])

  const handleDownloadCreatorPack = useCallback(() => {
    if (!creatorPackResult) return
    triggerCreatorPackDownload(creatorPackResult.blob, creatorPackResult.filename)
  }, [creatorPackResult])

  const hasAnyCreatorPackAsset =
    exportAssets.script || exportAssets.images || exportAssets.narration

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        <Download className="w-3 h-3" />
        Download assets
      </div>

      <div className="space-y-2">
        {assetError ? (
          <p className="text-[11px] text-amber-200/80" role="alert">
            {assetError}
          </p>
        ) : null}

        <DownloadRow
          icon={<FileText className="w-3 h-3" />}
          label="Script"
          hint={
            hasScript ? 'Full title, hook, and narration script' : ASSET_UNAVAILABLE_MSG
          }
        >
          <button
            type="button"
            onClick={handleDownloadTxt}
            disabled={!hasScript}
            className={hasScript ? secondaryButtonClass : ghostButtonClass}
          >
            <Download className="w-3 h-3" />
            .txt
          </button>
          <button
            type="button"
            onClick={handleDownloadDoc}
            disabled={!hasScript}
            className={hasScript ? secondaryButtonClass : ghostButtonClass}
          >
            <Download className="w-3 h-3" />
            .doc
          </button>
        </DownloadRow>

        <DownloadRow
          icon={<ImageIcon className="w-3 h-3" />}
          label="Scene images"
          hint={
            hasImages
              ? 'All storyboard stills as JPG — vertical or horizontal'
              : ASSET_UNAVAILABLE_MSG
          }
        >
          {(['vertical', 'horizontal'] as const).map((exportSize) => {
            const { label } = SCENE_IMAGE_EXPORT_DIMENSIONS[exportSize]
            const aspectLabel = exportSize === 'vertical' ? '9:16' : '16:9'
            const isDownloading = downloadingImagesFormat === exportSize
            return (
              <button
                key={exportSize}
                type="button"
                title={`Download all scenes at ${label} (${aspectLabel})`}
                onClick={() => void handleDownloadImages(exportSize)}
                disabled={!hasImages || downloadingImagesFormat !== null}
                className={hasImages ? primaryButtonClass : ghostButtonClass}
              >
                {isDownloading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {isDownloading ? 'Downloading…' : `All ${aspectLabel}`}
              </button>
            )
          })}
        </DownloadRow>

        <DownloadRow
          icon={<Mic className="w-3 h-3" />}
          label="Narration"
          hint={hasNarration ? 'Synced voiceover audio track' : ASSET_UNAVAILABLE_MSG}
        >
          <button
            type="button"
            onClick={() => void handleDownloadMp3()}
            disabled={!hasNarration || downloadingMp3}
            className={hasNarration ? secondaryButtonClass : ghostButtonClass}
          >
            {downloadingMp3 ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            {downloadingMp3 ? 'Downloading…' : '.mp3'}
          </button>
        </DownloadRow>

        <DownloadRow
          icon={<Video className="w-3 h-3" />}
          label="Video"
          data-recommend-target="mp4-export"
          hint={
            exportExpired
              ? EXPORT_EXPIRED_MSG
              : mp4DownloadReady
                ? 'Download ready — final synced MP4 reel'
                : mp4Compiling
                  ? renderStatusLabel || 'Rendering reel…'
                  : renderError
                    ? renderError
                    : canCompileMp4
                      ? 'Ken Burns motion · captions · voiceover'
                      : hasMp4
                        ? 'Available after render completes'
                        : ASSET_UNAVAILABLE_MSG
          }
        >
          {exportExpired ? (
            <button
              type="button"
              onClick={() => void retryVideoRender()}
              className={secondaryButtonClass}
            >
              Regenerate export
            </button>
          ) : hasMp4 ? (
            <>
              <button
                type="button"
                onClick={() => void handleDownloadMp4()}
                disabled={downloadingMp4 || mp4Compiling || exportExpired}
                className={primaryButtonClass}
              >
                {downloadingMp4 ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {downloadingMp4
                  ? 'Downloading…'
                  : mp4DownloadReady
                    ? '.mp4'
                    : 'Compile .mp4'}
              </button>
              {mp4DownloadReady ? (
                <>
                  <button
                    type="button"
                    onClick={handlePreviewReel}
                    className={secondaryButtonClass}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleShareReel()}
                    className={secondaryButtonClass}
                  >
                    <Share2 className="w-3 h-3" />
                    Share
                  </button>
                </>
              ) : null}
            </>
          ) : mp4Compiling ? (
            <button type="button" disabled className={ghostButtonClass}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Rendering reel…
            </button>
          ) : renderError ? (
            <button
              type="button"
              onClick={() => void retryVideoRender()}
              className={secondaryButtonClass}
            >
              Retry compile
            </button>
          ) : (
            <button type="button" disabled className={ghostButtonClass}>
              .mp4
            </button>
          )}
        </DownloadRow>

        <DownloadRow
          icon={<Package className="w-3 h-3" />}
          label="Creator Pack"
          data-recommend-target="creator-pack"
          hint={
            creatorPackState === 'preparing'
              ? 'Preparing Creator Pack…'
              : creatorPackState === 'ready'
                ? 'Creator Pack Ready — all available assets bundled'
                : creatorPackState === 'error'
                  ? 'Unable to create Creator Pack.'
                  : hasAnyCreatorPackAsset
                    ? 'ZIP bundle — script, storyboard, images, narration & metadata'
                    : ASSET_UNAVAILABLE_MSG
          }
        >
          {creatorPackState === 'preparing' ? (
            <button type="button" disabled className={ghostButtonClass}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Preparing… {creatorPackProgress > 0 ? `${creatorPackProgress}%` : ''}
            </button>
          ) : creatorPackState === 'ready' ? (
            <button
              type="button"
              onClick={handleDownloadCreatorPack}
              className={primaryButtonClass}
            >
              <Download className="w-3 h-3" />
              Download ZIP
            </button>
          ) : creatorPackState === 'error' ? (
            <button
              type="button"
              onClick={() => void handleExportCreatorPack()}
              className={secondaryButtonClass}
            >
              Retry Export
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleExportCreatorPack()}
              disabled={!hasAnyCreatorPackAsset}
              className={hasAnyCreatorPackAsset ? primaryButtonClass : ghostButtonClass}
            >
              <Package className="w-3 h-3" />
              Download Creator Pack
            </button>
          )}
        </DownloadRow>
      </div>

      <QuickCutPlatformExportProfiles />
    </div>
  )
}
