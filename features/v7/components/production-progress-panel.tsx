'use client'

import { cn } from '@/lib/utils'
import {
  formatCompletionClock,
  formatDurationMs,
  formatV7PausedFailureReason,
  type V7ProductionProgress,
} from '@/lib/v7/production-progress'

type V7ProductionProgressPanelProps = {
  progress: V7ProductionProgress
  className?: string
  onRetry?: () => void
  retrying?: boolean
}

export function V7ProductionProgressPanel({
  progress,
  className,
  onRetry,
  retrying = false,
}: V7ProductionProgressPanelProps) {
  const showEta = !progress.paused && progress.eta.label && progress.eta.label !== 'Complete'
  const failureCopy = progress.paused?.reason
    ? formatV7PausedFailureReason(progress.paused.reason)
    : null
  const showRetry = Boolean(progress.paused?.retryAvailable && onRetry)

  return (
    <section
      className={cn(
        'rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#D4AF37]/[0.07] to-transparent p-5 sm:p-6',
        className
      )}
      aria-label="Production progress"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4AF37]/80">
            {retrying ? 'Retrying' : progress.paused ? 'Production paused' : 'Live production'}
          </p>
          <p className="mt-2 text-lg font-semibold text-white sm:text-xl">
            {retrying ? 'Retrying failed stage…' : progress.currentTask}
          </p>
          {progress.currentStageLabel ? (
            <p className="mt-1 text-sm text-white/50">
              Current stage · {progress.currentStageLabel}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold tabular-nums text-[#E6C76A]">
            {progress.overallPercent}%
          </p>
          <p className="text-xs text-white/45">Overall progress</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#B8942E] to-[#E6C76A] transition-[width] duration-700 ease-out"
          style={{ width: `${progress.overallPercent}%` }}
          role="progressbar"
          aria-valuenow={progress.overallPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall production progress"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {progress.sceneProgress ? (
          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Scene</p>
            <p className="mt-1 text-sm font-medium text-white/90">
              Scene {progress.sceneProgress.currentSceneNumber ?? progress.sceneProgress.completedScenes}{' '}
              / {progress.sceneProgress.totalScenes}
            </p>
            <p className="mt-0.5 text-xs text-white/45">
              {progress.sceneProgress.completedScenes} completed ·{' '}
              {progress.sceneProgress.scenePercent}% of stage
            </p>
          </div>
        ) : null}

        {showEta ? (
          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">ETA</p>
            <p className="mt-1 text-sm font-medium text-white/90">{progress.eta.label}</p>
            {progress.eta.completionAt ? (
              <p className="mt-0.5 text-xs text-white/45">
                Expected completion · {formatCompletionClock(progress.eta.completionAt)}
              </p>
            ) : null}
          </div>
        ) : progress.paused ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 sm:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-red-200/60">Status</p>
            <p className="mt-1 text-sm font-medium text-red-100/90">
              {retrying ? 'Resuming image generation…' : 'ETA frozen until retry'}
            </p>
            {failureCopy?.summary ? (
              <p className="mt-2 text-sm font-medium text-red-100/90">{failureCopy.summary}</p>
            ) : null}
            {failureCopy?.detail ? (
              <p className="mt-1 text-xs text-red-200/75">{failureCopy.detail}</p>
            ) : null}
            {failureCopy?.technical ? (
              <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-red-200/60">
                {failureCopy.technical}
              </p>
            ) : progress.paused.reason ? (
              <p className="mt-2 break-words text-xs text-red-200/70">{progress.paused.reason}</p>
            ) : null}
            {showRetry ? (
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] touch-manipulation disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {retrying ? 'Retrying…' : 'Retry failed stage'}
              </button>
            ) : null}
          </div>
        ) : null}

        {progress.provider ? (
          <div
            className={cn(
              'rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3',
              !progress.sceneProgress && !showEta ? 'sm:col-span-2' : ''
            )}
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Provider</p>
            <p className="mt-1 text-sm font-medium text-white/90">{progress.provider.displayName}</p>
            <p className="mt-0.5 text-xs text-white/45">
              {progress.provider.model ? `${progress.provider.model} · ` : ''}
              {progress.provider.sceneNumber
                ? `Scene ${progress.provider.sceneNumber} of ${progress.provider.totalScenes} · `
                : ''}
              {progress.provider.status}
            </p>
          </div>
        ) : null}
      </div>

      {progress.completionStats ? (
        <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-3">
          <Stat label="Total generation" value={formatDurationMs(progress.completionStats.totalGenerationMs)} />
          {progress.completionStats.renderMs != null ? (
            <Stat label="Render time" value={formatDurationMs(progress.completionStats.renderMs)} />
          ) : null}
          {progress.completionStats.averageSceneGenerationMs != null ? (
            <Stat
              label="Avg scene generation"
              value={formatDurationMs(progress.completionStats.averageSceneGenerationMs)}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/85">{value}</p>
    </div>
  )
}
