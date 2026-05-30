'use client'

import { useCallback, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeedbackRatings, type FeedbackRating } from '@/lib/analytics/events'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const RATING_UI: { value: FeedbackRating; emoji: string; label: string }[] = [
  { value: 'excellent', emoji: '😍', label: 'Excellent' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'average', emoji: '😐', label: 'Average' },
  { value: 'weak', emoji: '😕', label: 'Weak' },
]

export function ExportFeedbackModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const projectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const [rating, setRating] = useState<FeedbackRating | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = useCallback(async () => {
    if (!rating || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/analytics/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          project_id: projectId,
          feedback_text: text.trim() || undefined,
        }),
      })
      setDone(true)
      setTimeout(onClose, 1200)
    } catch {
      setDone(true)
      setTimeout(onClose, 1200)
    } finally {
      setSubmitting(false)
    }
  }, [rating, text, projectId, submitting, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="export-feedback-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-gold-500/25 bg-[#0a0a0a] p-5 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-luxe/40 hover:text-luxe rounded-lg"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {done ? (
          <p className="text-center text-sm text-gold-200/90 py-8">Thanks — your feedback helps us improve.</p>
        ) : (
          <>
            <p
              id="export-feedback-title"
              className="text-[10px] tracking-[0.22em] uppercase text-gold-300/75 mb-1"
            >
              Quick check-in
            </p>
            <h3 className="font-display text-xl text-luxe mb-4 pr-6">
              How did this cinematic draft feel?
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {RATING_UI.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRating(r.value)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left transition-colors',
                    rating === r.value
                      ? 'border-gold-400/50 bg-gold-500/10'
                      : 'border-white/10 hover:border-white/20'
                  )}
                >
                  <span className="text-lg">{r.emoji}</span>
                  <span className="block text-xs text-luxe/80 mt-1">{r.label}</span>
                </button>
              ))}
            </div>

            <label className="block text-[11px] text-luxe/50 mb-1.5">What could improve? (optional)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Pacing, visuals, hook, voice…"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-luxe resize-none focus:outline-none focus:border-gold-500/40"
            />

            <button
              type="button"
              disabled={!rating || !FeedbackRatings.includes(rating) || submitting}
              onClick={() => void submit()}
              className="mt-4 w-full min-h-[40px] rounded-lg bg-gold-gradient text-black text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-40"
            >
              {submitting ? 'Sending…' : 'Share feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
