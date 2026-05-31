'use client'

import { cn } from '@/lib/utils'
import { relationshipLabel } from '@/lib/memory/relationship-score'
import type { RelationshipLevel } from '@/lib/memory/types'

type RelationshipBadgeProps = {
  level: RelationshipLevel
  score?: number
  className?: string
  size?: 'sm' | 'md'
}

const LEVEL_STYLES: Record<RelationshipLevel, string> = {
  explorer: 'border-luxe/20 bg-white/[0.04] text-luxe/60',
  collaborator: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  partner: 'border-gold-500/30 bg-gold-500/10 text-gold-200',
  director: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  creative_soulmate: 'border-rose-500/30 bg-gradient-to-r from-gold-500/15 to-rose-500/15 text-[#F4E7C1]',
}

export function RelationshipBadge({
  level,
  score,
  className,
  size = 'sm',
}: RelationshipBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        LEVEL_STYLES[level],
        className
      )}
      title={score != null ? `Relationship score: ${score}` : undefined}
    >
      <span className="opacity-70">Mugtee</span>
      <span>·</span>
      <span>{relationshipLabel(level)}</span>
    </span>
  )
}
