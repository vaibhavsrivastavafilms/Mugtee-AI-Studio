'use client'

import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import {
  hasFeedbackFor,
  saveCreatorFeedback,
  type FeedbackContext,
  type FeedbackRating,
} from '@/lib/creator/feedback'
import { cn } from '@/lib/utils'

export function CreatorFeedbackPrompt({
  context,
  question,
  secondaryQuestion,
}: {
  context: FeedbackContext
  question: string
  secondaryQuestion?: string
}) {
  const [submitted, setSubmitted] = useState(() => hasFeedbackFor(context))
  const [rating, setRating] = useState<FeedbackRating | null>(null)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  if (submitted) {
    return (
      <p className="mt-8 text-center text-[11px] tracking-[0.18em] uppercase text-white/30">
        Thanks — your feedback helps Mugtee feel more cinematic.
      </p>
    )
  }

  const submit = (value: FeedbackRating) => {
    setRating(value)
    setShowNote(true)
  }

  const finish = () => {
    if (!rating) return
    saveCreatorFeedback(context, rating, note)
    setSubmitted(true)
  }

  return (
    <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 text-center max-w-lg mx-auto">
      <p className="text-sm text-white/55">{question}</p>
      {secondaryQuestion ? (
        <p className="mt-1 text-[12px] text-white/35">{secondaryQuestion}</p>
      ) : null}

      {!showNote ? (
        <div className="mt-4 flex justify-center gap-3">
          <FeedbackButton
            icon={ThumbsUp}
            label="Yes"
            active={rating === 'up'}
            onClick={() => submit('up')}
          />
          <FeedbackButton
            icon={ThumbsDown}
            label="Not quite"
            active={rating === 'down'}
            onClick={() => submit('down')}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — what would make it feel more cinematic?"
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/70 placeholder:text-white/25 resize-none outline-none focus:border-[#D4AF37]/30"
          />
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={finish}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#D4AF37]/90 text-black text-xs font-medium hover:bg-[#E7C56A] transition"
            >
              Send feedback
            </button>
            <button
              type="button"
              onClick={() => {
                if (rating) saveCreatorFeedback(context, rating)
                setSubmitted(true)
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs hover:text-white/70 transition"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FeedbackButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof ThumbsUp
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 min-h-[44px] min-w-[100px] justify-center px-4 py-2 rounded-xl border text-xs transition',
        active
          ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#F4E7C1]'
          : 'border-white/10 text-white/55 hover:border-white/20 hover:text-white/75'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}
