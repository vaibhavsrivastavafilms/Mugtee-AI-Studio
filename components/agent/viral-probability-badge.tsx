'use client'

import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { scoreViralProbability, viralLabel } from '@/lib/agent/viral-probability'

export function ViralProbabilityBadge({
  topic,
  hookPreview,
  competitionScore,
  className,
}: {
  topic?: string
  hookPreview?: string
  competitionScore?: number
  className?: string
}) {
  const score = useMemo(
    () => scoreViralProbability({ topic, hookPreview, competitionScore }),
    [topic, hookPreview, competitionScore]
  )
  const { label, tone } = viralLabel(score)

  const toneClass =
    tone === 'high'
      ? 'border-gold-500/40 bg-gold-500/15 text-gold-200'
      : tone === 'medium'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100/90'
        : 'border-white/10 bg-white/[0.03] text-luxe/60'

  if (!topic && !hookPreview) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] tracking-wide',
        toneClass,
        className
      )}
    >
      <Flame className="w-3 h-3" />
      {label} · {score}
    </span>
  )
}
