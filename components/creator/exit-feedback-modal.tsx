'use client'

import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EXIT_FEEDBACK_REASONS,
  type ExitFeedbackReason,
  type ExitFeedbackTrigger,
} from '@/lib/creator/exit-feedback'

export function ExitFeedbackModal({
  open,
  trigger,
  onClose,
  onDismiss,
  showSkip = false,
}: {
  open: boolean
  trigger: ExitFeedbackTrigger | null
  onClose: () => void
  onDismiss: () => void
  showSkip?: boolean
}) {
  const [reason, setReason] = useState<ExitFeedbackReason | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = useCallback(async () => {
    if (!reason || !trigger || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/exit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger,
          reason,
          comment: text.trim() || undefined,
        }),
      })
      onDismiss()
      setDone(true)
      setTimeout(onClose, 1200)
    } catch {
      onDismiss()
      setDone(true)
      setTimeout(onClose, 1200)
    } finally {
      setSubmitting(false)
    }
  }, [reason, text, trigger, submitting, onClose, onDismiss])

  const dismiss = useCallback(() => {
    onDismiss()
    onClose()
  }, [onDismiss, onClose])

  if (!open || !trigger) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="exit-feedback-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-gold-500/25 bg-[#0a0a0a] p-5 shadow-2xl relative">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 text-luxe/40 hover:text-luxe rounded-lg"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {done ? (
          <p className="text-center text-sm text-gold-200/90 py-8">
            Thanks — your feedback helps us improve Mugtee.
          </p>
        ) : (
          <>
            <p
              id="exit-feedback-title"
              className="text-[10px] tracking-[0.22em] uppercase text-gold-300/75 mb-1"
            >
              Quick question
            </p>
            <h3 className="font-display text-xl text-luxe mb-4 pr-6">
              What stopped you from continuing with Mugtee?
            </h3>

            <fieldset className="space-y-2 mb-4">
              <legend className="sr-only">Exit reason</legend>
              {EXIT_FEEDBACK_REASONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                    reason === option.value
                      ? 'border-gold-400/50 bg-gold-500/10'
                      : 'border-white/10 hover:border-white/20'
                  )}
                >
                  <input
                    type="radio"
                    name="exit-reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="accent-[#D4AF37]"
                  />
                  <span className="text-sm text-luxe/85">{option.label}</span>
                </label>
              ))}
            </fieldset>

            <label className="block text-[11px] text-luxe/50 mb-1.5">Optional details</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Tell us more (optional)…"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-luxe resize-none focus:outline-none focus:border-gold-500/40"
            />

            <div className={cn('mt-4 flex gap-2', showSkip ? 'flex-row' : 'flex-col')}>
              <button
                type="button"
                disabled={!reason || submitting}
                onClick={() => void submit()}
                className={cn(
                  'min-h-[40px] rounded-lg bg-gold-gradient text-black text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-40',
                  showSkip ? 'flex-1' : 'w-full'
                )}
              >
                {submitting ? 'Sending…' : 'Share feedback'}
              </button>
              {showSkip ? (
                <button
                  type="button"
                  onClick={dismiss}
                  className="min-h-[40px] px-4 rounded-lg border border-white/10 text-luxe/60 text-[11px] tracking-[0.12em] uppercase hover:text-luxe transition"
                >
                  Skip
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
