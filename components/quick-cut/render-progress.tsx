'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STAGE_TAB_LABELS,
  STAGE_TAB_ORDER,
  isStageTabActive,
  isStageTabDone,
  isStageTabReachable,
} from '@/lib/cinematic/quick-cut/stage-tabs'
import { resolveQuickCutProgressLabel } from '@/lib/quick-cut/asset-availability'
import {
  isReelExportStuck,
  REEL_EXPORT_STUCK_MSG,
} from '@/lib/reels/export-poll.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export function RenderProgress({ className }: { className?: string }) {
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const progress = useQuickCutGenerationStore((s) => s.progress)
  const eta = useQuickCutGenerationStore((s) => s.eta)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const renderStartedAt = useQuickCutGenerationStore((s) => s.renderStartedAt)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)

  const exportInProgress =
    isRenderingVideo || (videoRenderEnabled && Boolean(renderPollUrl) && !videoUrl && !renderError)
  const exportStuck = exportInProgress && isReelExportStuck(renderStartedAt)

  const progressLabel = resolveQuickCutProgressLabel({
    generationStep,
    isComplete,
    videoUrl,
    videoRenderEnabled,
    renderError,
    renderPollUrl,
    isRenderingVideo,
    renderStatusLabel,
    exportPackageReady,
    exportExpired,
    hasScript: Boolean(script?.trim() || hook?.trim() || title?.trim() || scriptBeats.length),
    hasImages: scenes.some((scene) => Boolean(scene.imageUrl?.trim())),
    hasNarration: Boolean(voiceUrl?.trim()),
  })

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/80">
            {exportStuck ? REEL_EXPORT_STUCK_MSG : progressLabel || 'Preparing…'}
          </p>
          <span className="text-[10px] text-luxe/45 tabular-nums">
            {progress}%{!isComplete && eta > 0 ? ` · ~${eta}s` : ''}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-gold-gradient transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {exportStuck ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())}
            className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-amber-500/35 bg-amber-500/10 px-4 text-[10px] tracking-[0.16em] uppercase text-amber-100/90 hover:bg-amber-500/15 transition-colors"
          >
            Retry export
          </button>
        </div>
      ) : null}

      <nav aria-label="Generation stages">
        <ol className="flex flex-wrap gap-2">
          {STAGE_TAB_ORDER.map((tab) => {
            const reachable = isStageTabReachable(tab, generationStep, isComplete)
            const active = isStageTabActive(tab, generationStep, isComplete)
            const done = isStageTabDone(tab, generationStep, isComplete)
            const selected = activeStageTab === tab
            const stageBusy =
              active && !done ? ({ 'aria-busy': 'true' as const } as const) : ({ 'aria-busy': 'false' as const } as const)

            return (
              <li key={tab}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && setActiveStageTab(tab)}
                  aria-current={selected ? 'step' : undefined}
                  {...stageBusy}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[9px] tracking-[0.16em] uppercase border transition-colors',
                    'inline-flex items-center gap-1 min-h-[28px]',
                    !reachable && 'cursor-not-allowed opacity-40',
                    reachable && 'cursor-pointer hover:border-gold-500/45',
                    selected && reachable
                      ? 'border-gold-500/60 bg-gold-500/20 text-gold-100 ring-1 ring-gold-500/25'
                      : done
                        ? 'border-gold-500/30 bg-gold-500/10 text-gold-200'
                        : active
                          ? 'border-gold-500/50 bg-gold-500/15 text-gold-100'
                          : reachable
                            ? 'border-white/[0.1] text-luxe/55'
                            : 'border-white/[0.06] text-luxe/35'
                  )}
                >
                  {active && !done ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" aria-hidden />
                  ) : null}
                  {STAGE_TAB_LABELS[tab]}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
