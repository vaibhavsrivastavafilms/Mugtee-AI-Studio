'use client'

import { cn } from '@/lib/utils'
import { V7ProductionProgressPanel } from '@/features/v7/components/production-progress-panel'
import { V7ProductionStageProgressRow } from '@/features/v7/components/production-stage-progress-row'
import { V7ConceptSelector } from '@/features/v7/components/concept-selector'
import { isAwaitingConceptSelection } from '@/lib/v7/concept-selection.core'
import { useProductionProgress } from '@/features/v7/hooks/use-production-progress'
import { V7ProductionDownloadButton } from '@/features/v7/components/production-download-button'
import { v7HasDeliverableMedia } from '@/lib/v7/deliverable-media.core'
import type { V7ProductionSnapshot } from '@/types/v7/production'

type V7ProductionViewProps = {
  snapshot: V7ProductionSnapshot
  onRetry?: () => void
  retrying?: boolean
  onConceptSelected?: () => Promise<void>
  className?: string
  /** When embedded in workspace chrome, progress is shown in the workspace header instead. */
  hideProgressChrome?: boolean
}

export function V7ProductionView({
  snapshot,
  onRetry,
  retrying,
  onConceptSelected,
  className,
  hideProgressChrome = false,
}: V7ProductionViewProps) {
  const progress = useProductionProgress(snapshot)
  const { production } = snapshot

  const title = production.title
  const prompt = production.prompt
  const reelUrl = production.reel_url
  const movUrl = production.mov_url
  const thumbnailUrl = production.thumbnail_url
  const creatorPackUrl = production.creator_pack_url

  const hasDeliverableMedia = v7HasDeliverableMedia(production)
  const awaitingConcept = isAwaitingConceptSelection(production.timeline_json)
  const showProgress = !hasDeliverableMedia && !awaitingConcept
  const runningStageId = progress?.currentStageId ?? production.current_stage

  return (
    <div className={cn('mx-auto w-full max-w-2xl px-4 py-8', className)}>
      <header className="mb-8 text-center">
        {hasDeliverableMedia && thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="mx-auto mb-4 h-48 w-auto max-w-full rounded-xl object-cover shadow-lg"
          />
        ) : null}
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 line-clamp-2 text-sm text-white/50">{prompt}</p>
      </header>

      {awaitingConcept && onConceptSelected ? (
        <V7ConceptSelector snapshot={snapshot} onSelected={onConceptSelected} />
      ) : null}

      {progress && !hideProgressChrome && (showProgress || hasDeliverableMedia) ? (
        <V7ProductionProgressPanel
          progress={progress}
          className="mb-6"
          onRetry={onRetry}
          retrying={retrying}
        />
      ) : null}

      {showProgress && progress && !hideProgressChrome ? (
        <ol className="space-y-2" aria-label="Production stages">
          {progress.stageProgressList.map((stage) => (
            <V7ProductionStageProgressRow
              key={stage.stageId}
              stage={stage}
              emphasized={stage.stageId === runningStageId && stage.status === 'running'}
            />
          ))}
        </ol>
      ) : null}

      {hasDeliverableMedia ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <p className="text-center text-lg font-semibold text-emerald-300">Production complete</p>
          <p className="mt-1 text-center text-sm text-emerald-200/70">Your movie is ready.</p>
          <video
            src={reelUrl!}
            controls
            playsInline
            preload="metadata"
            poster={thumbnailUrl ?? undefined}
            className="mx-auto mt-4 aspect-[9/16] max-h-[70dvh] w-full max-w-lg rounded-xl bg-black object-contain"
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <V7ProductionDownloadButton productionId={production.id} title={title} />
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
      ) : null}
    </div>
  )
}
