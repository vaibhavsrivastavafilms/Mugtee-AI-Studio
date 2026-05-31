'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { submitMomentFeedback } from '@/lib/creator/moment-feedback'
import { useFeedbackStore } from '@/stores/feedback-store'
import { cn } from '@/lib/utils'

export function CreatorSuggestionBox({
  projectId,
  className,
  collapsedByDefault = true,
}: {
  projectId?: string | null
  className?: string
  collapsedByDefault?: boolean
}) {
  const markSubmitted = useFeedbackStore((s) => s.markSubmitted)
  const dismiss = useFeedbackStore((s) => s.dismiss)
  const [open, setOpen] = useState(!collapsedByDefault)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await submitMomentFeedback({
        feedback_type: 'suggestion',
        project_id: projectId,
        suggestion_text: trimmed,
      })
      markSubmitted('suggestion')
      setDone(true)
    } catch {
      dismiss('suggestion')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <p className={cn('text-[11px] text-center text-luxe/45 tracking-wide', className)}>
        Thanks — we read every suggestion.
      </p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left text-[11px] text-luxe/50 hover:text-luxe/70 transition-colors"
      >
        {open ? '▼' : '▶'} Tell Mugtee what would make this better
      </button>
      {open ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Feature ideas, workflow friction, tone…"
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-luxe/85 resize-none focus:outline-none focus:border-gold-500/30"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dismiss('suggestion')}
              className="text-[10px] uppercase tracking-wider text-luxe/40 hover:text-luxe/60 px-2 py-1"
            >
              Dismiss
            </button>
            <button
              type="button"
              disabled={!text.trim() || submitting}
              onClick={() => void submit()}
              className="inline-flex items-center gap-1.5 min-h-[32px] px-3 rounded-lg bg-gold-500/15 border border-gold-500/25 text-[10px] uppercase tracking-wider text-gold-200 disabled:opacity-40"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Send
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
