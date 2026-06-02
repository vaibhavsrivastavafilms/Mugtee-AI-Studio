'use client'

import { useEffect, useState, type RefObject } from 'react'
import { Play } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OutputWindow } from '@/components/quick-cut/output-window'
import { ReflectionLoop } from '@/components/companion/reflection-loop'
import { SectionStatusBadge } from '@/components/quick-cut/section-status-badge'
import { RegenerateMissingScenesBanner } from '@/components/quick-cut/regenerate-missing-scenes-banner'
import {
  ExportTabbedPanel,
  stageTabToExportSubTab,
} from '@/components/quick-cut/export-tabbed-panel'
import { resolveMp4ExportUiState } from '@/lib/quick-cut/mp4-export-readiness.client'
import { friendlyReelRenderError } from '@/lib/video/reel-render-errors'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

export type PreviewExportSubTab = 'preview' | 'export'

type PreviewExportTabbedPanelProps = {
  audioRef?: RefObject<HTMLAudioElement | null>
  className?: string
  preferredSubTab?: PreviewExportSubTab
  projectId?: string
  /** Live generation preview vs completed results */
  isLive?: boolean
  generationStep?: QuickCutGenerationStep
}

export function PreviewExportTabbedPanel({
  audioRef,
  className,
  preferredSubTab,
  projectId,
  isLive = false,
  generationStep: generationStepProp,
}: PreviewExportTabbedPanelProps) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const assemblyPreviewAutoplay = useQuickCutGenerationStore((s) => s.assemblyPreviewAutoplay)
  const reelTimeline = useQuickCutGenerationStore((s) => s.reelTimeline)
  const storeGenerationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)

  const generationStep = generationStepProp ?? storeGenerationStep
  const showInsightTabs = isComplete && !isLive

  const defaultSubTab: PreviewExportSubTab =
    preferredSubTab ??
    (generationStep === 'render' || isRenderingVideo || stageTabToExportSubTab(activeStageTab)
      ? 'export'
      : 'preview')

  const [subTab, setSubTab] = useState<PreviewExportSubTab>(defaultSubTab)

  useEffect(() => {
    if (preferredSubTab) setSubTab(preferredSubTab)
  }, [preferredSubTab])

  useEffect(() => {
    if (stageTabToExportSubTab(activeStageTab)) {
      setSubTab('export')
    }
  }, [activeStageTab])

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
  })
  const { mp4Compiling } = mp4Export

  const playerGenerationStep = isComplete && !isLive ? 'complete' : generationStep

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 min-w-0 space-y-3',
        className
      )}
      aria-label="Preview and export"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
          <Play className="w-3 h-3 shrink-0" aria-hidden />
          Preview &amp; export
        </div>
        <SectionStatusBadge section="export" status={sectionStatus.export} />
      </div>

      <Tabs
        value={subTab}
        onValueChange={(v) => setSubTab(v as PreviewExportSubTab)}
        className="space-y-3"
      >
        <TabsList
          className={cn(
            'grid w-full grid-cols-2 h-9 p-1',
            'bg-white/[0.03] border border-white/[0.06] rounded-lg',
            'overflow-x-auto scrollbar-luxe'
          )}
        >
          <TabsTrigger
            value="preview"
            className="text-[11px] font-medium tracking-[0.02em] data-[state=active]:bg-gold-500/15 data-[state=active]:text-gold-100"
          >
            Preview
          </TabsTrigger>
          <TabsTrigger
            value="export"
            className="text-[11px] font-medium tracking-[0.02em] data-[state=active]:bg-gold-500/15 data-[state=active]:text-gold-100"
          >
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-0 space-y-3 focus-visible:outline-none">
          <OutputWindow
            audioRef={audioRef}
            title={title}
            hook={hook}
            script={script}
            scenes={scenes}
            videoUrl={videoUrl}
            voiceUrl={voiceUrl}
            reelTimeline={reelTimeline}
            isLive={isLive}
            generationStep={generationStep}
            playerGenerationStep={playerGenerationStep}
            mp4Compiling={mp4Compiling}
            autoPlayPreview={
              (Boolean(voiceUrl) && !videoUrl) || assemblyPreviewAutoplay
            }
            showInsightTabs={showInsightTabs}
            footer={
              <>
                {renderError && !videoUrl ? (
                  <p className="text-[11px] text-amber-200/80 text-center" role="alert">
                    {friendlyReelRenderError(renderError)}
                  </p>
                ) : null}
                <RegenerateMissingScenesBanner />
                <ReflectionLoop />
              </>
            }
          />
        </TabsContent>

        <TabsContent value="export" className="mt-0 focus-visible:outline-none">
          <ExportTabbedPanel
            embedded
            audioRef={audioRef}
            projectId={projectId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
