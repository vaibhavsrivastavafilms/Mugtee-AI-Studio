'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  Download,
  Loader2,
  Mic,
  Package,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { QuickCutViewScriptButton } from '@/components/quick-cut/view-script-button'
import { ExportSatisfactionCard } from '@/components/feedback/export-satisfaction-card'
import { CreatorPackExportModal } from '@/components/export/creator-pack-export-modal'
import { ExportDiagnosticsChecklist } from '@/components/export/export-diagnostics-checklist'
import { ExportDevDiagnosticsPanel } from '@/components/export/export-dev-diagnostics-panel'
import { downloadMp3File } from '@/lib/quick-cut/download-audio'
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'
import { buildQuickCutScriptText } from '@/lib/quick-cut/download-script'
import {
  ASSET_UNAVAILABLE_MSG,
  resolveQuickCutExportAssets,
} from '@/lib/quick-cut/asset-availability'
import { blockMp4CompileIfNeeded } from '@/lib/export/mp4-compile-guard.client'
import { useUnifiedExportActions } from '@/lib/export/use-unified-export-actions.client'
import { useUsage } from '@/lib/usage'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const actionButtonClass =
  'inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase transition-opacity disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation'

const primaryActionClass = cn(actionButtonClass, 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90')
const secondaryActionClass = cn(
  actionButtonClass,
  'border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 hover:bg-gold-500/10'
)

type ExportCreatorPackSectionProps = {
  onOpenDirector?: () => void
}

export function ExportCreatorPackSection({ onOpenDirector }: ExportCreatorPackSectionProps) {
  const { isUnlimited, trial } = useUsage()
  const {
    assetError,
    showAdvancedMp4Export,
    mp4Enabled,
    mp4Compiling,
    downloadingMp4,
    reelReadinessValidating,
    mp4Label,
    mp4Subtitle,
    handleDownloadMp4,
    creatorPackReadiness,
    creatorPackState,
    creatorPackProgress,
    creatorPackSubtitle,
    creatorPackModalOpen,
    setCreatorPackModalOpen,
    handleExportCreatorPack,
    hasNarration,
    handleDownloadMp3,
    downloadingMp3,
    hasScript,
  } = useUnifiedExportActions({ supplementaryOnly: false })

  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)

  const [copiedScript, setCopiedScript] = useState(false)
  const [showExportFeedback, setShowExportFeedback] = useState(false)

  const exportBase = slugifyExportBase(title || 'mugtee-reel', 'mugtee-reel')
  const mp3Name = `${exportBase}-narration.mp3`

  const scriptInput = useMemo(
    () => ({ title, hook, script, scriptBeats, payoff, cta, isUnlimited }),
    [title, hook, script, scriptBeats, payoff, cta, isUnlimited]
  )

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

  const creatorPackEnabled =
    creatorPackReadiness.canExport && creatorPackState !== 'preparing'

  const handleCopyScript = useCallback(async () => {
    if (!exportAssets.script) return
    try {
      await navigator.clipboard.writeText(buildQuickCutScriptText(scriptInput))
      setCopiedScript(true)
      toast.success('Script copied')
      window.setTimeout(() => setCopiedScript(false), 2000)
    } catch {
      toast.error('Could not copy script')
    }
  }, [exportAssets.script, scriptInput])

  const handleCreatorPackClick = useCallback(async () => {
    await handleExportCreatorPack()
    setShowExportFeedback(true)
  }, [handleExportCreatorPack])

  return (
    <div className="space-y-3">
      <ExportDiagnosticsChecklist items={creatorPackReadiness.items} />

      <div className="flex flex-wrap items-stretch justify-center gap-2">
        <button
          type="button"
          data-recommend-target="creator-pack"
          onClick={() => void handleCreatorPackClick()}
          disabled={!creatorPackEnabled && creatorPackState !== 'error'}
          className={primaryActionClass}
        >
          {creatorPackState === 'preparing' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Package className="w-3.5 h-3.5" aria-hidden />
          )}
          {creatorPackState === 'preparing'
            ? 'Generating…'
            : creatorPackState === 'error'
              ? 'Retry Creator Pack'
              : creatorPackState === 'ready'
                ? 'Download Creator Pack'
                : 'Export Creator Pack'}
        </button>

        {showAdvancedMp4Export ? (
          <button
            type="button"
            data-recommend-target="mp4-export"
            onClick={() => void handleDownloadMp4()}
            disabled={!mp4Enabled}
            className={secondaryActionClass}
            title={mp4Subtitle}
          >
            {downloadingMp4 || mp4Compiling || reelReadinessValidating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="w-3.5 h-3.5" aria-hidden />
            )}
            {mp4Label}
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

        {showAdvancedMp4Export && renderError ? (
          <button
            type="button"
            onClick={() => {
              if (
                blockMp4CompileIfNeeded(trial.planType, {
                  trialActive: trial.active,
                  isUnlimited,
                  logContext: { source: 'export-creator-pack.retryMp4' },
                })
              ) {
                return
              }
              const runCompile = renderPollUrl ? resumeRenderPoll : retryVideoRender
              if (typeof runCompile !== 'function') {
                console.error('[EXPORT] compile function unavailable', { planType: trial.planType })
                return
              }
              void runCompile()
            }}
            className={secondaryActionClass}
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden />
            Retry MP4
          </button>
        ) : null}
      </div>

      <p className="text-center text-[10px] text-luxe/45">{creatorPackSubtitle}</p>

      {assetError ? (
        <p className="text-center text-[11px] text-amber-200/80" role="alert">
          {assetError}
        </p>
      ) : null}

      {showExportFeedback ? (
        <ExportSatisfactionCard
          projectId={savedProjectId}
          className="w-full"
          onDismissed={() => setShowExportFeedback(false)}
        />
      ) : null}

      <ExportDevDiagnosticsPanel
        projectId={savedProjectId}
        scenes={scenes}
        voiceUrl={voiceUrl}
        title={title}
        hook={hook}
        script={script}
        videoRenderEnabled={videoRenderEnabled}
        isGenerating={isGenerating}
      />

      <CreatorPackExportModal
        open={creatorPackModalOpen}
        onOpenChange={setCreatorPackModalOpen}
        progress={creatorPackProgress}
        exportState={creatorPackState}
        errorMessage={assetError}
        onDownload={() => void handleExportCreatorPack()}
        onOpenDirector={onOpenDirector}
      />
    </div>
  )
}
