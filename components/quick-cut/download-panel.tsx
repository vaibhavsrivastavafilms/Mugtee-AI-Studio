'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Clapperboard,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Mic,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUsage } from '@/lib/usage'
import { downloadMp3File } from '@/lib/quick-cut/download-audio'
import { downloadMp4File } from '@/lib/quick-cut/download-mp4'
import {
  downloadAllStoryboardImages,
  SCENE_IMAGE_EXPORT_DIMENSIONS,
  slugifyExportBase,
  type SceneImageExportSize,
} from '@/lib/quick-cut/download-scene-image'
import { downloadScriptDoc, downloadScriptTxt } from '@/lib/quick-cut/download-script'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
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
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
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
  const pollStartedRef = useRef(false)
  const exportTrackedRef = useRef(false)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)

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

  const exportBase = slugifyExportBase(title || 'mugtee-reel', 'mugtee-reel')
  const mp4Name = `${exportBase}.mp4`
  const mp3Name = `${exportBase}-narration.mp3`

  const hasScript = Boolean(script?.trim() || hook?.trim() || title?.trim())
  const hasImages = !isGenerating && scenes.some((s) => s.imageUrl?.trim())
  const hasNarration = Boolean(voiceUrl?.trim())
  const canCompileMp4 = quickCutCanCompileMp4(scenes, voiceUrl, videoRenderEnabled)
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

  const scriptInput = { title, hook, script, isUnlimited }

  const handleDownloadTxt = useCallback(() => {
    trackExportStarted('script_txt')
    downloadScriptTxt(scriptInput)
  }, [title, hook, script, isUnlimited, trackExportStarted])

  const handleDownloadDoc = useCallback(() => {
    downloadScriptDoc(scriptInput)
  }, [title, hook, script, isUnlimited])

  const handleDownloadImages = useCallback(
    async (exportSize: SceneImageExportSize) => {
      if (downloadingImagesFormat || scenes.length < 1) return
      trackExportStarted(`images_${exportSize}`)
      setDownloadingImagesFormat(exportSize)
      try {
        await downloadAllStoryboardImages(scenes, title || 'mugtee-storyboard', exportSize)
      } finally {
        setDownloadingImagesFormat(null)
      }
    },
    [downloadingImagesFormat, scenes, title, trackExportStarted]
  )

  const handleDownloadMp3 = useCallback(async () => {
    if (!voiceUrl?.trim() || downloadingMp3) return
    trackExportStarted('narration_mp3')
    setDownloadingMp3(true)
    try {
      await downloadMp3File(voiceUrl, mp3Name)
    } finally {
      setDownloadingMp3(false)
    }
  }, [voiceUrl, mp3Name, downloadingMp3, trackExportStarted])

  const handleDownloadMp4 = useCallback(async () => {
    if (!videoUrl?.trim() || downloadingMp4) return
    trackExportStarted('video_mp4')
    setDownloadingMp4(true)
    try {
      await downloadMp4File(videoUrl, mp4Name)
    } finally {
      setDownloadingMp4(false)
    }
  }, [videoUrl, mp4Name, downloadingMp4, trackExportStarted])

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
        <DownloadRow
          icon={<FileText className="w-3 h-3" />}
          label="Script"
          hint="Full title, hook, and narration script"
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
          hint="All storyboard stills as JPG — vertical or horizontal"
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
          hint="Synced voiceover audio track"
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
          hint={
            videoUrl
              ? 'Final synced MP4 reel'
              : mp4Compiling
                ? renderStatusLabel || 'Compiling MP4…'
                : renderError
                  ? renderError
                  : canCompileMp4
                    ? 'Compile slides and narration into one MP4'
                    : 'Available after render completes'
          }
        >
          {videoUrl ? (
            <button
              type="button"
              onClick={() => void handleDownloadMp4()}
              disabled={downloadingMp4}
              className={primaryButtonClass}
            >
              {downloadingMp4 ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              {downloadingMp4 ? 'Downloading…' : '.mp4'}
            </button>
          ) : mp4Compiling ? (
            <button type="button" disabled className={ghostButtonClass}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Compiling…
            </button>
          ) : canCompileMp4 ? (
            <button
              type="button"
              onClick={() => void retryVideoRender()}
              disabled={isRenderingVideo}
              className={primaryButtonClass}
            >
              <Clapperboard className="w-3 h-3" />
              Compile .mp4
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
      </div>
    </div>
  )
}
