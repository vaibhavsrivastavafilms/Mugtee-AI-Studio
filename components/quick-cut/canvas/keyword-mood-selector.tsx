'use client'

import { useMemo } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOOD_KEYWORDS, type MoodKeyword } from '@/components/quick-cut/canvas/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const triggerClassName =
  'flex h-9 w-full items-center justify-between rounded-md border border-white/[0.08] bg-black/30 px-3 py-2 text-xs text-luxe/85 hover:border-gold-500/25 focus:outline-none focus:ring-2 focus:ring-gold-500/20'

function formatMoodSummary(selected: MoodKeyword[]): string {
  if (selected.length === 0) return 'Select mood & tone'
  if (selected.length === 1) return selected[0]
  if (selected.length === 2) return selected.join(', ')
  return `${selected.slice(0, 2).join(', ')} +${selected.length - 2}`
}

export function KeywordMoodSelector({
  selected,
  onToggle,
  className,
}: {
  selected: MoodKeyword[]
  onToggle: (keyword: MoodKeyword) => void
  className?: string
}) {
  const summary = useMemo(() => formatMoodSummary(selected), [selected])

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor="quick-cut-mood-tone"
        className="text-[9px] tracking-[0.24em] uppercase text-luxe/45"
      >
        Mood & tone
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger
          id="quick-cut-mood-tone"
          aria-label="Mood and tone"
          className={triggerClassName}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] bg-[#0a0a0a] border-white/[0.08] text-luxe/90"
        >
          {MOOD_KEYWORDS.map((keyword) => {
            const active = selected.includes(keyword)
            return (
              <DropdownMenuItem
                key={keyword}
                className="text-xs focus:bg-gold-500/10 focus:text-gold-200"
                onSelect={(event) => {
                  event.preventDefault()
                  onToggle(keyword)
                }}
              >
                <Check
                  className={cn('h-4 w-4 shrink-0', active ? 'opacity-100 text-gold-300' : 'opacity-0')}
                  aria-hidden="true"
                />
                <span>{keyword}</span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
