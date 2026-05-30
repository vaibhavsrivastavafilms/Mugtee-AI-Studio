'use client'

import { useCallback, useState } from 'react'
import { Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { markProjectFeedbackSubmitted } from '@/lib/creator/project-feedback-storage'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export function ProjectCompletionFeedbackModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const projectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const [rating, setRating] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = useCallback(async () => {
    if (!rating || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          project_id: projectId,
          comment: text.trim() || undefined,
        }),
      })
      markProjectFeedbackSubmitted(projectId)
      setDone(true)
      setTimeout(onClose, 1200)
    } catch {
      markProjectFeedbackSubmitted(projectId)
      setDone(true)
      setTimeout(onClose, 1200)
    } finally {
      setSubmitting(false)
    }
  }, [rating, text, projectId, submitting, onClose])

  if (!open) return null

  const display = hover ?? rating

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="project-feedback-title"
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
          <p className="text-center text-sm text-gold-200/90 py-8">
            Thanks — your feedback helps shape Mugtee.
          </p>
        ) : (
          <>
            <p
              id="project-feedback-title"
              className="text-[10px] tracking-[0.22em] uppercase text-gold-300/75 mb-1"
            >
              Founding Creator Beta
            </p>
            <h3 className="font-display text-xl text-luxe mb-4 pr-6">
              Was this output useful?
            </h3>

            <div className="flex justify-center gap-1 mb-4" role="group" aria-label="Rating 1 to 5 stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  <Star
                    className={cn(
                      'w-7 h-7 transition-colors',
                      display !== null && n <= display
                        ? 'fill-gold-400 text-gold-400'
                        : 'text-white/25'
                    )}
                  />
                </button>
              ))}
            </div>

            <label className="block text-[11px] text-luxe/50 mb-1.5">Optional comment</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What worked well? What should we improve?"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-luxe resize-none focus:outline-none focus:border-gold-500/40"
            />

            <button
              type="button"
              disabled={!rating || submitting}
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
