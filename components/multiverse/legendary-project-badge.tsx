'use client'

import { legendaryBadgeLabel } from '@/lib/multiverse/legendary-projects'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'

export function LegendaryProjectBadge({
  title,
  score,
  className,
  compact = false,
}: {
  title: string
  score: number
  className?: string
  compact?: boolean
}) {
  const label = legendaryBadgeLabel(score)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-400/40',
        'bg-amber-500/[0.1] px-2.5 py-1 text-amber-100/90',
        compact && 'text-[9px] px-2 py-0.5',
        className
      )}
      title={`${title} — score ${score}`}
    >
      <Star className={cn('text-amber-300', compact ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      <span className={cn('tracking-[0.08em] uppercase', compact ? 'text-[9px]' : 'text-[10px]')}>
        {label}
      </span>
      {!compact && <span className="text-[10px] text-amber-200/60 truncate max-w-[120px]">{title}</span>}
    </span>
  )
}
