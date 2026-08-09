'use client'

import { Check, Circle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { V7ProductionProgressPanel } from '@/features/v7/components/production-progress-panel'
import { useProductionProgress } from '@/features/v7/hooks/use-production-progress'
import { resolveV7SceneProgress } from '@/lib/v7/production-progress'
import type {
  V7ProductionSnapshot,
  V7ProductionStatus,
  V7StageId,
  V7TimelineStage,
} from '@/types/v7/production'

type V7ProductionViewProps = {
  snapshot: V7ProductionSnapshot
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

function StageIcon({ status }: { status: V7TimelineStage['status'] }) {
  if (status === 'completed') return <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-[#E6C76A]" />
  if (status === 'failed') return <X className="h-4 w-4 text-red-400" />
  if (status === 'blocked') return <Circle className="h-4 w-4 text-amber-400/70" />
  return <Circle className="h-4 w-4 text-white/20" />
}

function sceneStageDetail(snapshot: V7ProductionSnapshot, stageId: V7StageId): string | null {
  const timelineStage = snapshot.timeline.find((stage) => stage.id === stageId)
  if (timelineStage?.status !== 'running' && timelineStage?.status !== 'blocked') return null

  const scene = resolveV7SceneProgress(snapshot, stageId)
  if (!scene) return null
  return `Scene ${scene.completedScenes}/${scene.totalScenes} · ${scene.scenePercent}%`
}

export function V7ProductionView({ snapshot, onRetry, retrying, className }: V7ProductionViewProps) {
  const progress = useProductionProgress(snapshot)
  const { production, timeline } = snapshot

  const title = production.title
  const prompt = production.prompt
  const status = production.status as V7ProductionStatus
  const reelUrl = production.reel_url
  const movUrl = production.mov_url
  const thumbnailUrl = production.thumbnail_url
  const creatorPackUrl = production.creator_pack_url

  const hasFailed = timeline.some((stage) => stage.status === 'failed')
  const isFinished = status === 'completed' && Boolean(reelUrl)
  const showProgress = !isFinished

  return (
    <div className={cn('mx-auto w-full max-w-2xl px-4 py-8', className)}>
      <header className="mb-8 text-center">
        {isFinished && thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="mx-auto mb-4 h-48 w-auto max-w-full rounded-xl object-cover shadow-lg"
          />
        ) : null}
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-white/50 line-clamp-2">{prompt}</p>
      </header>

      {progress && showProgress ? <V7ProductionProgressPanel progress={progress} className="mb-6" /> : null}

      {progress && isFinished ? (
        <V7ProductionProgressPanel progress={progress} className="mb-6" />
      ) : null}

      {showProgress ? (
        <ol className="space-y-2" aria-label="Production stages">
          {timeline.map((stage) => {
            const sceneDetail = sceneStageDetail(snapshot, stage.id)
            return (
              <li
                key={stage.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 transition',
                  stage.status === 'running' && 'border-[#D4AF37]/40 bg-[#D4AF37]/5',
                  stage.status === 'completed' && 'border-white/[0.06] bg-white/[0.02]',
                  stage.status === 'failed' && 'border-red-500/30 bg-red-500/5',
                  stage.status === 'blocked' && 'border-amber-500/20 bg-amber-500/5 opacity-80',
                  stage.status === 'pending' && 'border-white/[0.04] opacity-60'
                )}
              >
                <StageIcon status={stage.status} />
                <span className="text-lg" aria-hidden>
                  {stage.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/90">
                    {stage.label}
                    {stage.status === 'running' ? '…' : ''}
                  </p>
                  {sceneDetail ? (
                    <p className="mt-0.5 text-xs text-[#E6C76A]/80">{sceneDetail}</p>
                  ) : null}
                  {stage.error ? (
                    <p className="mt-0.5 truncate text-xs text-red-300/80">{stage.error}</p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}

      {isFinished ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <p className="text-center text-lg font-semibold text-emerald-300">Production complete</p>
          <p className="mt-1 text-center text-sm text-emerald-200/70">Your movie is ready.</p>
          <video
            src={reelUrl!}
            controls
            playsInline
            poster={thumbnailUrl ?? undefined}
            className="mx-auto mt-4 max-h-[70vh] w-full max-w-lg rounded-xl bg-black"
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <a
              href={reelUrl!}
              download
              className="rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#0B0B0B]"
            >
              Download MP4
            </a>
            {movUrl ? (
              <a
                href={movUrl}
                download
                className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90"
              >
                Download MOV
              </a>
            ) : null}
            {creatorPackUrl ? (
              <a
                href={creatorPackUrl}
                download
                className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/90"
              >
                Creator Pack
              </a>
            ) : null}
          </div>
        </div>
      ) : hasFailed ? (
        <div className="mt-8 text-center">
          <p className="text-sm text-red-300/90">
            {progress?.paused?.failedStageLabel
              ? `Production paused at ${progress.paused.failedStageLabel}.`
              : 'Production paused at a failed stage.'}
          </p>
          {progress?.paused?.reason ? (
            <p className="mx-auto mt-2 max-w-md text-xs text-red-200/70">{progress.paused.reason}</p>
          ) : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="mt-4 rounded-lg bg-[#D4AF37] px-6 py-2.5 text-sm font-semibold text-[#0B0B0B] disabled:opacity-60"
            >
              {retrying ? 'Retrying…' : 'Retry failed stage'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
