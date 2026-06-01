'use client'

import {
  isReelExportStuck,
  REEL_EXPORT_STUCK_MSG,
} from '@/lib/reels/export-poll.client'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Export retry UI — progress and step navigation live in {@link WorkflowHeader}. */
export function ExportRetryStrip({ className }: { className?: string }) {
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderStartedAt = useQuickCutGenerationStore((s) => s.renderStartedAt)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)

  const exportInProgress =
    isRenderingVideo || (videoRenderEnabled && Boolean(renderPollUrl) && !videoUrl && !renderError)
  const exportStuck = exportInProgress && isReelExportStuck(renderStartedAt)

  if (!exportStuck) return null

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2', className)}>
      <p className="text-[10px] tracking-[0.16em] uppercase text-amber-200/80">
        {REEL_EXPORT_STUCK_MSG}
      </p>
      <button
        type="button"
        onClick={() => void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())}
        className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-amber-500/35 bg-amber-500/10 px-4 text-[10px] tracking-[0.14em] uppercase text-amber-100/90 hover:bg-amber-500/15 transition-colors shrink-0"
      >
        Retry export
      </button>
    </div>
  )
}

/** @deprecated Use WorkflowHeader for progress + steps; ExportRetryStrip for stuck exports. */
export function RenderProgress({ className }: { className?: string }) {
  return <ExportRetryStrip className={className} />
}
