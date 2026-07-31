'use client'

import { cn } from '@/lib/utils'
import { qcV2Panel } from '@/lib/quick-cut/quick-cut-v2-design'
import { useQuickCutProjectStatus } from '@/lib/quick-cut/use-quick-cut-project-status'
import { EXPORT_DISABLED_MESSAGE } from '@/lib/generation/generation-pipeline-messages'
import { isClientVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled.client'

type QuickCutV2StatusCardProps = {
  className?: string
}

export function QuickCutV2StatusCard({ className }: QuickCutV2StatusCardProps) {
  const {
    projectName,
    progressPercent,
    etaLabel,
    etaDisplay,
    stageLabel,
    status,
    voiceFallbackMessage,
    exportPackageReady,
    videoRenderEnabled,
    mp4ExportReady,
    isGenerating,
    imagesDone,
    scenesCount,
  } = useQuickCutProjectStatus()

  const mp4Enabled = isClientVideoRenderEnabled(videoRenderEnabled)
  // Warn only once (soft) — never block the pipeline.
  const showVoiceNotice = Boolean(voiceFallbackMessage && isGenerating === false && !mp4ExportReady)
  const showExportNotice = !mp4Enabled && exportPackageReady && !mp4ExportReady && !isGenerating

  return (
    <div className={cn(qcV2Panel, 'p-5 sm:p-6 space-y-4', className)}>
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Production OS</p>
        <h2 className="text-lg sm:text-xl font-semibold text-white truncate">{projectName}</h2>
      </div>

      {showVoiceNotice ? (
        <p className="text-xs text-amber-200/85 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          Voice unavailable — continuing without narration.
        </p>
      ) : null}

      {showExportNotice ? (
        <p className="text-xs text-white/70 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          Export unavailable — {EXPORT_DISABLED_MESSAGE}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Progress</p>
          <p className="text-base font-semibold text-[#E6C76A] tabular-nums">
            {status === 'COMPLETE' ? 'Movie Complete' : `${progressPercent}%`}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">
            Estimated Time Remaining
          </p>
          <p className="text-base font-medium text-white/85 tabular-nums">
            {status === 'COMPLETE' ? 'Done' : etaLabel || etaDisplay || '8s'}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Current Stage</p>
          <p className="text-base font-medium text-white truncate">{stageLabel}</p>
          {scenesCount > 0 && isGenerating ? (
            <p className="text-[11px] text-white/45 mt-0.5 tabular-nums">
              {imagesDone} / {scenesCount} images complete
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
