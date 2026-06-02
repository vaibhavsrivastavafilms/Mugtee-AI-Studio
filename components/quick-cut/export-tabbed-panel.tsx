'use client'

import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import {
  Check,
  Copy,
  Download,
  Layers,
  Loader2,
  Mic,
  Package,
  RefreshCw,
  Share2,
  Video,
  LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickCutViewScriptButton } from '@/components/quick-cut/view-script-button'
import { QuickCutDownloadPanel } from '@/components/quick-cut/download-panel'
import { ContentRepurposePanel } from '@/components/quick-cut/content-repurpose-panel'
import { OutputWorkspacePanel } from '@/components/workspace/output-workspace/output-workspace-panel'
import { ReelComposer } from '@/components/reel-composer/ReelComposer'
import { ExportSatisfactionCard } from '@/components/feedback/export-satisfaction-card'
import { SectionStatusBadge } from '@/components/quick-cut/section-status-badge'
import {
  ExportSummaryGrid,
  PublishCenterIntro,
  PublishReadinessSection,
  BufferPublishingSection,
} from '@/components/quick-cut/publish-center'
import { downloadMp3File } from '@/lib/quick-cut/download-audio'
import { resolveMp4Download } from '@/lib/quick-cut/resolve-mp4-download.client'
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'
import { buildQuickCutScriptText } from '@/lib/quick-cut/download-script'
import {
  ASSET_UNAVAILABLE_MSG,
  EXPORT_EXPIRED_MSG,
  resolveQuickCutExportAssets,
} from '@/lib/quick-cut/asset-availability'
import { resolveMp4ExportUiState } from '@/lib/quick-cut/mp4-export-readiness.client'
import { trackClientUsage } from '@/lib/usage/plan-limit-toast.client'
import { useUsage } from '@/lib/usage'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { Mp4ExportEvents, trackMp4ExportClient } from '@/lib/analytics/mp4-export-events'
import { trackEvent } from '@/lib/analytics/track-event'
import { useReelDownloadReadiness } from '@/lib/export/reel-download-readiness.client'
import { useReelExportAutoResume } from '@/lib/export/use-reel-export-auto-resume.client'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'

export type ExportSubTab = 'download' | 'publish' | 'repurpose' | 'workspace'

const EXPORT_SUB_TABS: { id: ExportSubTab; label: string; icon: typeof Download }[] = [
  { id: 'download', label: 'Download', icon: Download },
  { id: 'publish', label: 'Publish', icon: Share2 },
  { id: 'repurpose', label: 'Repurpose', icon: Layers },
  { id: 'workspace', label: 'Workspace', icon: LayoutGrid },
]

const actionButtonClass =
  'inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase transition-opacity disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation'

const primaryActionClass = cn(actionButtonClass, 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90')
const secondaryActionClass = cn(
  actionButtonClass,
  'border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 hover:bg-gold-500/10'
)

export function stageTabToExportSubTab(tab: QuickCutStageTab | null): ExportSubTab | null {
  if (tab === 'publish') return 'publish'
  if (tab === 'repurpose') return 'repurpose'
  if (tab === 'complete' || tab === 'render') return 'download'
  return null
}

function ExportRenderStatus() {
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)

  if (videoUrl?.trim()) return null

  const failed = Boolean(renderError) || sectionStatus.export === 'failed'

  return (
    <div className="space-y-2">
      {failed ? (
        <>
          <p className="text-[12px] text-red-300/90" role="alert">
            {renderError || 'Export failed — try again.'}
          </p>
          <button
            type="button"
            onClick={() => void retryVideoRender()}
            disabled={isRenderingVideo}
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/80 hover:text-gold-200 transition-colors disabled:opacity-50"
          >
            {isRenderingVideo ? (
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="w-3 h-3" aria-hidden />
            )}
            Retry compile
          </button>
        </>
      ) : isRenderingVideo ? (
        <>
          <p className="text-[12px] text-luxe/70 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-400/80 shrink-0" />
            {renderStatusLabel || 'Rendering reel…'}
          </p>
          <p className="text-[11px] text-luxe/45">
            Assembling film → rendering reel → download ready.
          </p>
        </>
      ) : (
        <p className="text-[12px] text-luxe/55 italic">Compile MP4 to finish export.</p>
      )}
    </div>
  )
}

function ExportPrimaryDownloadActions() {
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
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)

  const [downloadingMp4, setDownloadingMp4] = useState(false)
  const [downloadingMp3, setDownloadingMp3] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [showExportFeedback, setShowExportFeedback] = useState(false)

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
  const hasNarration = exportAssets.narration

  const reelReadiness = useReelDownloadReadiness({
    projectId: savedProjectId,
    videoUrl,
    isRendering: isRenderingVideo,
    renderPollUrl,
    exportExpired,
  })

  const mp4Export = resolveMp4ExportUiState({
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
    exportExpired,
    exportPackageReady,
    isRenderingVideo,
    renderPollUrl,
    renderError,
    downloadValidated: videoUrl?.trim()
      ? reelReadiness.ready || !savedProjectId
      : undefined,
    reelValidating: reelReadiness.validating,
    downloadingMp4,
  })

  const {
    canCompileMp4,
    mp4DownloadReady,
    mp4Compiling,
    hasMp4Action: hasMp4,
    mp4ButtonEnabled,
  } = mp4Export

  useReelExportAutoResume({ canCompileMp4 })

  const guardExport = useCallback(async () => trackClientUsage('exports'), [])

  const scriptInput = useMemo(
    () => ({ title, hook, script, scriptBeats, payoff, cta, isUnlimited }),
    [title, hook, script, scriptBeats, payoff, cta, isUnlimited]
  )

  const handleDownloadMp4 = useCallback(async () => {
    if (downloadingMp4) return
    if (!videoUrl?.trim() && !canCompileMp4 && !savedProjectId) return
    if (!(await guardExport())) return
    trackMp4ExportClient(Mp4ExportEvents.EXPORT_CLICKED, {
      projectId: savedProjectId,
      metadata: { asset: 'video_mp4', source: 'export_tabbed_panel' },
    })
    trackEvent(AnalyticsEvents.EXPORT_STARTED, {
      projectId: savedProjectId,
      metadata: { asset: 'video_mp4', source: 'export_tabbed_panel' },
    })
    setAssetError(null)
    setDownloadingMp4(true)
    if (mp4Compiling || reelReadiness.validating) {
      toast.message('Preparing your video…')
    }
    try {
      if (videoUrl?.trim() || savedProjectId) {
        await resolveMp4Download({
          projectId: savedProjectId,
          videoUrl,
          filename: mp4Name,
          compileIfNeeded: canCompileMp4 && !videoUrl,
          onProgress: (label) => toast.message(label, { id: 'mp4-export-progress' }),
        })
        toast.success('Video ready for download.', { id: 'mp4-export-progress' })
        setShowExportFeedback(true)
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
        toast.success('Video ready for download.')
        setShowExportFeedback(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      const expired = message === EXPORT_EXPIRED_MSG || message.includes('Export job expired')
      useQuickCutGenerationStore.setState({
        renderError: message,
        ...(expired ? { exportExpired: true, videoUrl: null } : {}),
      })
      setAssetError(message)
      toast.error('Download failed. Please try again.', { id: 'mp4-export-progress' })
    } finally {
      setDownloadingMp4(false)
    }
  }, [
    videoUrl,
    mp4Name,
    downloadingMp4,
    savedProjectId,
    canCompileMp4,
    retryVideoRender,
    guardExport,
    mp4Compiling,
    reelReadiness.validating,
  ])

  const handleDownloadMp3 = useCallback(async () => {
    if (!hasNarration || downloadingMp3) return
    if (!(await guardExport())) return
    trackEvent(AnalyticsEvents.EXPORT_STARTED, {
      projectId: savedProjectId,
      metadata: { asset: 'narration_mp3' },
    })
    setAssetError(null)
    setDownloadingMp3(true)
    try {
      await downloadMp3File(voiceUrl!, mp3Name)
      setShowExportFeedback(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      setAssetError(message)
    } finally {
      setDownloadingMp3(false)
    }
  }, [voiceUrl, mp3Name, downloadingMp3, hasNarration, savedProjectId, guardExport])

  const handleCopyScript = useCallback(async () => {
    if (!hasScript) return
    try {
      await navigator.clipboard.writeText(buildQuickCutScriptText(scriptInput))
      setCopiedScript(true)
      toast.success('Script copied')
      window.setTimeout(() => setCopiedScript(false), 2000)
    } catch {
      toast.error('Could not copy script')
    }
  }, [hasScript, scriptInput])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-stretch justify-center gap-2">
        <button
          type="button"
          data-recommend-target="mp4-export"
          onClick={() => void handleDownloadMp4()}
          disabled={!mp4ButtonEnabled}
          className={hasMp4 ? primaryActionClass : secondaryActionClass}
        >
          {downloadingMp4 || mp4Compiling || reelReadiness.validating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="w-3.5 h-3.5" aria-hidden />
          )}
          {downloadingMp4
            ? 'Downloading…'
            : mp4Compiling || reelReadiness.validating
              ? 'Preparing…'
              : mp4DownloadReady
                ? 'Download MP4'
                : 'Compile MP4'}
        </button>

        {reelReadiness.validationError && !mp4Compiling ? (
          <button
            type="button"
            onClick={() => void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())}
            className={cn(
              actionButtonClass,
              'border border-gold-500/30 bg-gold-500/[0.06] text-gold-200'
            )}
          >
            Retry export
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void handleDownloadMp3()}
          disabled={!hasNarration || downloadingMp3}
          className={secondaryActionClass}
        >
          {downloadingMp3 ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Mic className="w-3.5 h-3.5" aria-hidden />
          )}
          {downloadingMp3 ? 'Downloading…' : 'Download Audio'}
        </button>

        <QuickCutViewScriptButton
          compact
          triggerClassName={cn(
            secondaryActionClass,
            '!rounded-xl !min-h-[44px] !px-4 !py-2 !text-[10px]'
          )}
        />

        <button
          type="button"
          onClick={() => void handleCopyScript()}
          disabled={!hasScript}
          className={secondaryActionClass}
        >
          {copiedScript ? (
            <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden />
          ) : (
            <Copy className="w-3.5 h-3.5" aria-hidden />
          )}
          {copiedScript ? 'Copied' : 'Copy Script'}
        </button>
      </div>

      {reelReadiness.validationError && !mp4Compiling ? (
        <p className="text-center text-[11px] text-amber-200/80" role="status">
          {reelReadiness.validationError}
        </p>
      ) : null}

      {assetError ? (
        <p className="text-center text-[11px] text-amber-200/80" role="alert">
          {assetError}
        </p>
      ) : null}

      {renderError && !videoUrl ? (
        <p className="text-center text-[11px] text-amber-200/80" role="alert">
          {renderError}
        </p>
      ) : null}

      {showExportFeedback ? (
        <ExportSatisfactionCard
          projectId={savedProjectId}
          className="w-full"
          onDismissed={() => setShowExportFeedback(false)}
        />
      ) : null}
    </div>
  )
}

type ExportTabbedPanelProps = {
  className?: string
  audioRef?: RefObject<HTMLAudioElement | null>
  projectId?: string
  preferredSubTab?: ExportSubTab
  /** Strip outer card when nested inside PreviewExportTabbedPanel */
  embedded?: boolean
}

export function ExportTabbedPanel({
  className,
  audioRef,
  projectId,
  preferredSubTab,
  embedded = false,
}: ExportTabbedPanelProps) {
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const reelTimeline = useQuickCutGenerationStore((s) => s.reelTimeline)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)

  const showRenderStatus =
    generationStep === 'render' ||
    isRenderingVideo ||
    (!isComplete && !videoUrl?.trim())

  const tabFromStore = useMemo(
    () => stageTabToExportSubTab(activeStageTab) ?? preferredSubTab ?? 'download',
    [activeStageTab, preferredSubTab]
  )

  const [subTab, setSubTab] = useState<ExportSubTab>(tabFromStore)

  useEffect(() => {
    setSubTab(tabFromStore)
  }, [tabFromStore])

  const tabs = (
    <Tabs
      value={subTab}
      onValueChange={(v) => setSubTab(v as ExportSubTab)}
      className="space-y-3"
    >
      <TabsList
        className={cn(
          'grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-9 p-1 gap-1',
          'bg-white/[0.03] border border-white/[0.06] rounded-lg',
          'overflow-x-auto scrollbar-luxe'
        )}
      >
        {EXPORT_SUB_TABS.map(({ id, label, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="text-[10px] sm:text-[11px] font-medium tracking-[0.02em] min-h-[32px] data-[state=active]:bg-gold-500/15 data-[state=active]:text-gold-100"
          >
            <Icon className="w-3 h-3 mr-1 hidden sm:inline" aria-hidden />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="download" className="mt-0 space-y-3 focus-visible:outline-none">
        <ExportPrimaryDownloadActions />
        {showRenderStatus ? <ExportRenderStatus /> : null}
        <ExportSummaryGrid embedded />
        {isComplete && reelTimeline ? (
          <ReelComposer timeline={reelTimeline} audioRef={audioRef} showDirectorTracks />
        ) : null}
        <QuickCutDownloadPanel embedded supplementaryOnly={isComplete} />
      </TabsContent>

      <TabsContent value="publish" className="mt-0 space-y-3 focus-visible:outline-none">
        <PublishCenterIntro embedded />
        <PublishReadinessSection embedded />
        <BufferPublishingSection embedded />
      </TabsContent>

      <TabsContent value="repurpose" className="mt-0 focus-visible:outline-none">
        <ContentRepurposePanel embedded />
      </TabsContent>

      <TabsContent value="workspace" className="mt-0 focus-visible:outline-none">
        <OutputWorkspacePanel embedded projectId={projectId} />
      </TabsContent>
    </Tabs>
  )

  if (embedded) {
    return <div className={cn('min-w-0', className)}>{tabs}</div>
  }

  return (
    <div
      data-generation-stage-panel
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 min-h-[120px] space-y-3',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
          <Package className="w-3 h-3" />
          Export
        </div>
        <SectionStatusBadge section="export" status={sectionStatus.export} />
      </div>
      {tabs}
    </div>
  )
}
