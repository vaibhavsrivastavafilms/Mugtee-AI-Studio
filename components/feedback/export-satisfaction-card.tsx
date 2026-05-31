'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import {
  EXPORT_READINESS_LABELS,
  submitMomentFeedback,
  type ExportReadiness,
} from '@/lib/creator/moment-feedback'
import { useFeedbackStore } from '@/stores/feedback-store'
import { cn } from '@/lib/utils'

const OPTIONS: ExportReadiness[] = ['used_as_is', 'minor_edits', 'major_edits']

export function ExportSatisfactionCard({
  projectId,
  className,
  onDismissed,
}: {
  projectId?: string | null
  className?: string
  onDismissed?: () => void
}) {
  const shouldShow = useFeedbackStore((s) => s.shouldShow('export_satisfaction'))
  const markSubmitted = useFeedbackStore((s) => s.markSubmitted)
  const dismiss = useFeedbackStore((s) => s.dismiss)

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!shouldShow && !done) return null

  const pick = async (value: ExportReadiness) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await submitMomentFeedback({
        feedback_type: 'export_satisfaction',
        project_id: projectId,
        export_readiness: value,
      })
      markSubmitted('export_satisfaction')
      setDone(true)
    } catch {
      dismiss('export')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDismiss = () => {
    dismiss('export')
    onDismissed?.()
  }

  if (done) {
    return (
      <p className={cn('text-[11px] text-center text-luxe/45 tracking-[0.12em] uppercase', className)}>
        Thanks — export feedback saved
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
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 p-1 text-luxe/35 hover:text-luxe/60 rounded-md"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <p className="text-sm text-luxe/80 pr-6">Was this project ready to use?</p>

      <div className="flex flex-col gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={submitting}
            onClick={() => void pick(opt)}
            className="min-h-[40px] w-full rounded-lg border border-white/10 text-left px-3 py-2 text-xs text-luxe/70 hover:border-gold-500/25 hover:bg-gold-500/[0.04] transition disabled:opacity-50"
          >
            {EXPORT_READINESS_LABELS[opt]}
          </button>
        ))}
      </div>

      {submitting ? (
        <p className="text-[10px] text-center text-luxe/40 flex items-center justify-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving…
        </p>
      ) : null}
    </div>
  )
}
