'use client'

import { cn } from '@/lib/utils'
import { QUICK_START_TEMPLATES } from '@/lib/activation/first-activation'
import { markHasCreatedProject } from '@/lib/onboarding/onboarding-state'

/** @deprecated Prefer QuickStartTemplates — kept for legacy imports */
export const SUGGESTION_CHIP_PROMPTS: Record<string, string> = Object.fromEntries(
  QUICK_START_TEMPLATES.map((t) => [t.label, t.prompt])
)

type SuggestionChipsProps = {
  onSelect: (prompt: string) => void
  className?: string
}

export function SuggestionChips({ onSelect, className }: SuggestionChipsProps) {
  return (
    <div className={cn('space-y-2', className)} aria-label="Quick suggestions">
      <p className="text-[10px] tracking-[0.24em] uppercase text-luxe/45 text-center">
        Smart suggestions
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_START_TEMPLATES.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => {
              markHasCreatedProject()
              onSelect(chip.prompt)
            }}
            className={cn(
              'rounded-full border border-gold-500/20 bg-gold-500/[0.05]',
              'px-3 py-1.5 text-[11px] text-[#F4E7C1]/80',
              'hover:border-gold-500/35 hover:text-gold-100 transition min-h-[36px]'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
