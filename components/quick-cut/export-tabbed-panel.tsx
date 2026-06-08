'use client'

import { useEffect, useMemo, useState, type RefObject } from 'react'
import {
  Download,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Share2,
  LayoutGrid,
} from 'lucide-react'
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
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'
import { ExportCreatorPackSection } from '@/components/export/export-creator-pack-section'
import { VideoRenderDisabledNotice } from '@/components/quick-cut/video-render-disabled-notice'
import { RegenerateMissingScenesBanner } from '@/components/quick-cut/regenerate-missing-scenes-banner'
import { BrowserExportPreflight } from '@/components/quick-cut/browser-export-preflight'
import { ExportErrorBoundary } from '@/components/quick-cut/export-error-boundary'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { isClientVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled.client'

export type ExportSubTab = 'download' | 'publish' | 'repurpose' | 'workspace'

const EXPORT_SUB_TABS: { id: ExportSubTab; label: string; icon: typeof Download }[] = [
  { id: 'download', label: 'Download', icon: Download },
  { id: 'publish', label: 'Publish', icon: Share2 },
  { id: 'repurpose', label: 'Repurpose', icon: Layers },
  { id: 'workspace', label: 'Workspace', icon: LayoutGrid },
]

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
  const configVideoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const videoRenderEnabled = isClientVideoRenderEnabled(configVideoRenderEnabled)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)

  if (videoUrl?.trim()) return null
  if (!videoRenderEnabled) return null

  const failed =
    videoRenderEnabled &&
    (Boolean(renderError) || sectionStatus.export === 'failed')

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
            Step 1: Assembling film · Step 2: Rendering reel · Step 3: Download ready
          </p>
        </>
      ) : (
        <p className="text-[12px] text-luxe/55 italic">Export Creator Pack to finish.</p>
      )}
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
  const title = useQuickCutGenerationStore((s) => s.title)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const configVideoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const syncVideoRenderConfig = useQuickCutGenerationStore((s) => s.syncVideoRenderConfig)
  const videoRenderEnabled = isClientVideoRenderEnabled(configVideoRenderEnabled)

  useEffect(() => {
    void syncVideoRenderConfig()
  }, [syncVideoRenderConfig])

  const showRenderStatus =
    generationStep === 'render' ||
    isRenderingVideo ||
    (!isComplete && !videoUrl?.trim())

  const tabFromStore = useMemo(
    () => stageTabToExportSubTab(activeStageTab) ?? preferredSubTab ?? 'download',
    [activeStageTab, preferredSubTab]
  )

  const [mounted, setMounted] = useState(false)
  const [subTab, setSubTab] = useState<ExportSubTab>('download')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    setSubTab(tabFromStore)
  }, [mounted, tabFromStore])

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
        <ExportErrorBoundary>
          <VideoRenderDisabledNotice />
          <RegenerateMissingScenesBanner />
          <ExportCreatorPackSection />
          {isComplete && reelTimeline && videoRenderEnabled ? (
            <BrowserExportPreflight
              timeline={reelTimeline}
              projectId={projectId}
              filenameBase={slugifyExportBase(title || 'mugtee-reel', 'mugtee-reel')}
            />
          ) : null}
          {showRenderStatus ? <ExportRenderStatus /> : null}
          <ExportSummaryGrid embedded />
          {isComplete && reelTimeline ? (
            <ReelComposer timeline={reelTimeline} audioRef={audioRef} showDirectorTracks />
          ) : null}
          <QuickCutDownloadPanel embedded supplementaryOnly={isComplete} />
        </ExportErrorBoundary>
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
