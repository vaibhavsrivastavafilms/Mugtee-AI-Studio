'use client'

import { useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'
import type { ProducerRecommendationItem, ProducerScoreFactors } from '@/lib/director/producer/types'

const SCORE_LABELS: Array<{ key: keyof ProducerScoreFactors; label: string }> = [
  { key: 'storyStrength', label: 'Story Strength' },
  { key: 'audienceFit', label: 'Audience Fit' },
  { key: 'emotionalImpact', label: 'Emotional Impact' },
  { key: 'curiosity', label: 'Curiosity' },
  { key: 'visualPotential', label: 'Visual Potential' },
  { key: 'retention', label: 'Retention' },
  { key: 'shareability', label: 'Shareability' },
  { key: 'cinematicQuality', label: 'Cinematic Quality' },
]

function ScoreRing({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 75 ? 'text-gold-300' : pct >= 55 ? 'text-amber-300/90' : 'text-red-300/80'
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/[0.06] bg-black/30">
      <span className={cn('text-xl font-semibold tabular-nums', color)}>{pct}</span>
      <span className="text-[9px] uppercase tracking-[0.14em] text-white/40 text-center leading-tight">
        {label}
      </span>
    </div>
  )
}

function RecommendationList({
  items,
  variant,
  onFeedback,
  memory,
}: {
  items: ProducerRecommendationItem[]
  variant: 'strength' | 'risk' | 'opportunity' | 'suggestion'
  onFeedback?: (id: string, accepted: boolean) => void
  memory?: { acceptedSuggestionIds: string[]; rejectedSuggestionIds: string[] }
}) {
  const variantStyles = {
    strength: 'border-gold-500/20 bg-gold-500/[0.04]',
    risk: 'border-red-500/20 bg-red-500/[0.04]',
    opportunity: 'border-emerald-500/20 bg-emerald-500/[0.04]',
    suggestion: 'border-white/[0.08] bg-white/[0.02]',
  }

  if (!items.length) return null

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const accepted = memory?.acceptedSuggestionIds.includes(item.id)
        const rejected = memory?.rejectedSuggestionIds.includes(item.id)
        return (
          <li
            key={item.id}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-xs text-white/75 leading-relaxed',
              variantStyles[variant],
              accepted && 'ring-1 ring-gold-500/30',
              rejected && 'opacity-50'
            )}
          >
            <p>{item.text}</p>
            {onFeedback && variant !== 'strength' ? (
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="text-[9px] uppercase tracking-wider text-gold-400/80 hover:text-gold-300"
                  onClick={() => onFeedback(item.id, true)}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="text-[9px] uppercase tracking-wider text-white/35 hover:text-white/55"
                  onClick={() => onFeedback(item.id, false)}
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export function ProducerPanel() {
  const producerReport = useDirectorStudioStore((s) => s.producerReport)
  const storyReadinessScore = useDirectorStudioStore((s) => s.storyReadinessScore)
  const producerRecommendations = useDirectorStudioStore((s) => s.producerRecommendations)
  const producerApproved = useDirectorStudioStore((s) => s.producerApproved)
  const loading = useDirectorStudioStore((s) => s.loading)
  const error = useDirectorStudioStore((s) => s.error)
  const projectId = useDirectorStudioStore((s) => s.projectId)
  const runAnalysis = useDirectorStudioStore((s) => s.runProducerAnalysis)
  const acceptSuggestion = useDirectorStudioStore((s) => s.acceptSuggestion)
  const rejectSuggestion = useDirectorStudioStore((s) => s.rejectSuggestion)
  const approveReview = useDirectorStudioStore((s) => s.approveProducerReview)
  const requestRefinement = useDirectorStudioStore((s) => s.requestProducerRefinement)
  const loadReport = useDirectorStudioStore((s) => s.loadProducerReport)

  useEffect(() => {
    if (projectId && !producerReport) void loadReport()
  }, [projectId, producerReport, loadReport])

  const handleFeedback = useCallback(
    (id: string, accepted: boolean) => {
      if (accepted) void acceptSuggestion(id)
      else void rejectSuggestion(id)
    },
    [acceptSuggestion, rejectSuggestion]
  )

  const readinessLabel = producerReport?.readinessLabel ?? 'Needs Refinement'
  const isReady = producerReport?.productionReady ?? (storyReadinessScore ?? 0) >= 75

  return (
    <DirectorPanelShell
      title="Executive Producer Review"
      subtitle="Strategic feedback on your creative package — no content generation, only honest producer notes before you build characters."
      actions={
        <>
          <button
            type="button"
            className={directorBtnOutline}
            disabled={loading || !projectId}
            onClick={() => runAnalysis()}
          >
            {producerReport ? 'Re-analyze' : 'Run producer review'}
          </button>
          {producerReport ? (
            <>
              <button
                type="button"
                className={directorBtnOutline}
                disabled={loading}
                onClick={() => requestRefinement()}
              >
                Request refinement
              </button>
              <button
                type="button"
                className={directorBtnPrimary}
                disabled={loading || producerApproved}
                onClick={() => approveReview()}
              >
                {producerApproved ? 'Approved' : 'Approve & continue'}
              </button>
            </>
          ) : null}
        </>
      }
    >
      {error ? <p className="text-xs text-red-400/90">{error}</p> : null}

      {loading && !producerReport ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gold-200/60 animate-pulse">Producer analyzing creative package…</p>
        </div>
      ) : null}

      {producerReport ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl border border-gold-500/25 bg-gradient-to-r from-gold-500/[0.08] to-transparent">
            <div className="shrink-0">
              <div
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center border-2',
                  isReady ? 'border-gold-400/50 bg-gold-500/10' : 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <span className="text-2xl font-bold text-gold-100 tabular-nums">
                  {storyReadinessScore ?? producerReport.storyReadinessScore}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400/70">Story Readiness</p>
              <p className={cn('text-lg font-semibold', isReady ? 'text-gold-200' : 'text-amber-200/90')}>
                {readinessLabel}
              </p>
              <p className="text-xs text-white/45 mt-1">
                Composite score across story, audience, emotion, retention, and cinematic quality.
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-3">Score breakdown</p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {SCORE_LABELS.map(({ key, label }) => (
                <ScoreRing key={key} score={producerReport.scores[key]} label={label} />
              ))}
            </div>
          </div>

          {producerRecommendations?.strengths.length ? (
            <section className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-gold-400/80">Strengths</h3>
              <RecommendationList items={producerRecommendations.strengths} variant="strength" />
            </section>
          ) : null}

          {producerRecommendations?.risks.length ? (
            <section className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-red-400/70">Risks</h3>
              <RecommendationList
                items={producerRecommendations.risks}
                variant="risk"
                onFeedback={handleFeedback}
                memory={producerReport.producerMemory}
              />
            </section>
          ) : null}

          {producerRecommendations?.opportunities.length ? (
            <section className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-emerald-400/70">Missed opportunities</h3>
              <RecommendationList
                items={producerRecommendations.opportunities}
                variant="opportunity"
                onFeedback={handleFeedback}
                memory={producerReport.producerMemory}
              />
            </section>
          ) : null}

          {producerRecommendations?.suggestions.length ? (
            <section className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-white/50">Creative suggestions</h3>
              <RecommendationList
                items={producerRecommendations.suggestions}
                variant="suggestion"
                onFeedback={handleFeedback}
                memory={producerReport.producerMemory}
              />
            </section>
          ) : null}

          {producerRecommendations?.challengeReframes.length ? (
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-amber-400/80">Challenge reframes</h3>
              <p className="text-xs text-white/40 italic">
                The producer is pushing back — consider these sharper angles before production.
              </p>
              <div className="space-y-3">
                {producerRecommendations.challengeReframes.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4 space-y-2"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/60">Weakness</p>
                    <p className="text-xs text-white/55">{c.originalWeakness}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gold-400/60 mt-2">Reframe</p>
                    <p className="text-sm text-gold-100/90 leading-relaxed">{c.reframe}</p>
                    {c.rationale ? (
                      <p className="text-[11px] text-white/40 italic">{c.rationale}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {producerApproved ? (
            <p className="text-xs text-gold-400/70 border-t border-white/[0.06] pt-4">
              Producer review approved — guidance will inform downstream generation.
            </p>
          ) : null}
        </div>
      ) : !loading ? (
        <div className="py-10 text-center space-y-2">
          <p className="text-sm text-white/50">No producer report yet.</p>
          <p className="text-xs text-white/35">
            Run the executive producer review after your blueprint is ready.
          </p>
        </div>
      ) : null}
    </DirectorPanelShell>
  )
}
