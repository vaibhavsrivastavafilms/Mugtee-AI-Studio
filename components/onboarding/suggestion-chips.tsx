'use client'

import { cn } from '@/lib/utils'
import { markHasCreatedProject } from '@/lib/onboarding/onboarding-state'

export const SUGGESTION_CHIP_PROMPTS: Record<string, string> = {
  'Viral Reel':
    'A viral reel about the one habit that quietly changed my mornings — fast hook, emotional payoff, 60 seconds',
  Documentary:
    'A mini documentary on how a forgotten invention shaped modern life — archival tone, cinematic pacing',
  'YouTube Script':
    'YouTube script: 5 brutal truths about building in public that nobody warns you about',
  'Storytelling Video':
    'A storytelling video about the night everything changed — intimate voice, slow reveal, cinematic B-roll',
  'Business Content':
    'Business breakdown: how one pricing decision doubled revenue without adding headcount',
  'Faceless Channel':
    'Faceless channel reel on stoic discipline — text overlays, moody B-roll, no talking head',
}

type SuggestionChipsProps = {
  onSelect: (prompt: string) => void
  className?: string
}

export function SuggestionChips({ onSelect, className }: SuggestionChipsProps) {
  const chips = Object.keys(SUGGESTION_CHIP_PROMPTS)

  return (
    <div className={cn('space-y-2', className)} aria-label="Quick suggestions">
      <p className="text-[10px] tracking-[0.24em] uppercase text-luxe/45 text-center">
        Smart suggestions
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => {
              markHasCreatedProject()
              onSelect(SUGGESTION_CHIP_PROMPTS[chip]!)
            }}
            className={cn(
              'rounded-full border border-gold-500/20 bg-gold-500/[0.05]',
              'px-3 py-1.5 text-[11px] text-[#F4E7C1]/80',
              'hover:border-gold-500/35 hover:text-gold-100 transition min-h-[36px]'
            )}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
