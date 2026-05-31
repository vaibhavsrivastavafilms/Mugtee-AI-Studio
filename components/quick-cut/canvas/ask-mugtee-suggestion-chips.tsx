'use client'

import { Brain, Clapperboard, LineChart, Megaphone } from 'lucide-react'
import { ASK_MUGTEE_PROMPT_CHIPS } from '@/lib/cinematic/quick-cut/copy'
import { cn } from '@/lib/utils'

const CHIP_ICONS = [Brain, Clapperboard, LineChart, Megaphone] as const

export function AskMugteeSuggestionChips({
  onSelect,
  className,
}: {
  onSelect: (chip: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5',
        className
      )}
    >
      {ASK_MUGTEE_PROMPT_CHIPS.map((chip, i) => {
        const Icon = CHIP_ICONS[i] ?? Brain
        return (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            className={cn(
              'group flex items-start gap-2.5 rounded-xl border border-white/[0.08]',
              'bg-black/35 backdrop-blur-md px-3 py-2.5 text-left min-h-[44px]',
              'hover:border-gold-500/35 hover:bg-gold-500/[0.06] transition-all duration-200',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/40'
            )}
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold-500/20 bg-gold-500/[0.08] text-gold-300/90 group-hover:border-gold-500/35 transition-colors">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="text-[11px] sm:text-xs leading-snug text-luxe/70 group-hover:text-gold-100/90 transition-colors">
              {chip}
            </span>
          </button>
        )
      })}
    </div>
  )
}
