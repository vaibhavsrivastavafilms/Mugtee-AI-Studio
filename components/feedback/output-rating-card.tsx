'use client'

import { useState } from 'react'
import { Loader2, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { ImprovementReasonPicker } from '@/components/feedback/improvement-reason-picker'
import { CreatorSuggestionBox } from '@/components/feedback/creator-suggestion-box'
import {
  submitMomentFeedback,
  type ImprovementReason,
  type OutputRating,
} from '@/lib/creator/moment-feedback'
import { logFeedbackNegative, logFeedbackPositive } from '@/lib/memory/learning-loop'
import { useFeedbackStore } from '@/stores/feedback-store'
import { cn } from '@/lib/utils'

export function OutputRatingCard({
  projectId,
  className,
}: {
  projectId?: string | null
  className?: string
}) {
  const shouldShow = useFeedbackStore((s) => s.shouldShow('output_rating'))
  const markSubmitted = useFeedbackStore((s) => s.markSubmitted)
  const dismiss = useFeedbackStore((s) => s.dismiss)

  const [rating, setRating] = useState<OutputRating | null>(null)
  const [reason, setReason] = useState<ImprovementReason | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!shouldShow && !done) return null

  const submit = async (value: OutputRating, improvementReason?: ImprovementReason | null) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await submitMomentFeedback({
        feedback_type: 'output_rating',
        project_id: projectId,
        rating: value,
        improvement_reason: improvementReason ?? null,
      })
      if (value === 'needs_improvement') {
        logFeedbackNegative({
          projectId: projectId ?? undefined,
          aspect: improvementReason ?? 'output',
        })
      } else {
        logFeedbackPositive({ projectId: projectId ?? undefined })
      }
      markSubmitted('output_rating')
      setDone(true)
    } catch {
      dismiss('output-rating')
    } finally {
      setSubmitting(false)
    }
  }

  const onPick = (value: OutputRating) => {
    setRating(value)
    if (value === 'helpful') {
      void submit('helpful')
    }
  }

  const onReason = (r: ImprovementReason) => {
    setReason(r)
    if (rating === 'needs_improvement') void submit('needs_improvement', r)
  }

  if (done) {
    return (
      <p className={cn('text-[11px] text-center text-luxe/45 tracking-[0.12em] uppercase', className)}>
        Thanks for the feedback
      </p>
    )
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border border-gold-500/15 bg-black/45 p-4 space-y-3',
        className
      )}
    >
      <button
        type="button"
        onClick={() => dismiss('output-rating')}
        className="absolute top-2.5 right-2.5 p-1 text-luxe/35 hover:text-luxe/60 rounded-md"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <p className="text-sm text-luxe/80 pr-6">How helpful was this output?</p>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          type="button"
          disabled={submitting}
          onClick={() => onPick('helpful')}
          className={cn(
            'inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl border text-xs transition',
            rating === 'helpful'
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
              : 'border-white/10 text-luxe/60 hover:border-white/20'
          )}
        >
          {submitting && rating === 'helpful' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="w-3.5 h-3.5" />
          )}
          Helpful
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => onPick('needs_improvement')}
          className={cn(
            'inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl border text-xs transition',
            rating === 'needs_improvement'
              ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
              : 'border-white/10 text-luxe/60 hover:border-white/20'
          )}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          Needs improvement
        </button>
      </div>

      {rating === 'needs_improvement' ? (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-luxe/50 text-center">What missed the mark?</p>
          <ImprovementReasonPicker value={reason} onChange={onReason} />
          {submitting ? (
            <p className="text-[10px] text-center text-luxe/40 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </p>
          ) : null}
        </div>
      ) : null}

      <CreatorSuggestionBox projectId={projectId} collapsedByDefault />
    </div>
  )
}
