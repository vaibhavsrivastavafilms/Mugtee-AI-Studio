'use client'

import { useState } from 'react'
import { ChevronDown, Lightbulb, X } from 'lucide-react'
import { CREATOR_GUIDANCE, type GuidanceStep } from '@/lib/creator/guidance'
import {
  dismissGuidance,
  isGuidanceDismissed,
} from '@/lib/creator/session-insights'
import { cn } from '@/lib/utils'

export function CreatorGuidance({ step }: { step: GuidanceStep }) {
  const guidance = CREATOR_GUIDANCE[step]
  const [open, setOpen] = useState(true)
  const [hidden, setHidden] = useState(() => isGuidanceDismissed(step))

  if (hidden) return null

  const dismiss = () => {
    dismissGuidance(step)
    setHidden(true)
  }

  return (
    <aside className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 min-h-[44px]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-2 text-left text-[10px] tracking-[0.22em] uppercase text-[#C8A24E]/85 min-h-[44px]"
        >
          <Lightbulb className="w-3.5 h-3.5 shrink-0" />
          {guidance.title}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-white/40 transition-transform ml-auto',
              open && 'rotate-180'
            )}
          />
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="p-2 rounded-md text-white/30 hover:text-white/60 transition shrink-0"
          aria-label="Dismiss guidance"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {open ? (
        <ul className="px-4 pb-4 space-y-2 border-t border-white/[0.04] pt-3">
          {guidance.tips.map((tip) => (
            <li
              key={tip}
              className="text-[13px] text-white/50 leading-relaxed pl-3 border-l border-[#D4AF37]/20"
            >
              {tip}
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  )
}
