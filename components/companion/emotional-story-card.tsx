'use client'

import { useEffect } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { companionCopy } from '@/lib/companion/microcopy'
import { EMOTIONAL_DIMENSION_LABELS, analyzeEmotionalStory } from '@/lib/companion/emotional-analysis'
import { useCompanionStore } from '@/stores/companion-store'
import type { EmotionalDimensionLabel } from '@/lib/companion/types'

type EmotionalStoryCardProps = {
  hook?: string
  script?: string
  scenes?: Array<{ title?: string; description?: string; duration?: number }>
  duration?: number
  className?: string
}

function labelColor(label: EmotionalDimensionLabel): string {
  if (label === 'Strong' || label === 'High' || label === 'Peak') {
    return 'text-gold-200 border-gold-500/35 bg-gold-500/[0.08]'
  }
  if (label === 'Smooth' || label === 'Steady' || label === 'Building') {
    return 'text-luxe/75 border-white/[0.1] bg-white/[0.04]'
  }
  return 'text-amber-200/80 border-amber-500/25 bg-amber-500/[0.06]'
}

export function EmotionalStoryCard({
  hook,
  script,
  scenes,
  duration,
  className,
}: EmotionalStoryCardProps) {
  const analysis = useCompanionStore((s) => s.emotionalAnalysis)
  const runEmotionalAnalysis = useCompanionStore((s) => s.runEmotionalAnalysis)

  useEffect(() => {
    if (!hook && !script) return
    void runEmotionalAnalysis({ hook, script, scenes, duration })
  }, [hook, script, scenes, duration, runEmotionalAnalysis])

  const resolved =
    analysis ??
    (hook || script
      ? analyzeEmotionalStory({ hook, script, scenes, duration })
      : null)

  if (!resolved) return null

  const dims = EMOTIONAL_DIMENSION_LABELS

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        <Heart className="w-3 h-3" />
        {companionCopy('emotionalCardTitle')}
      </div>

      <p className="text-[12px] text-luxe/70 leading-relaxed italic">{resolved.summary}</p>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(dims) as Array<keyof typeof dims>).map((key) => (
          <span
            key={key}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] tracking-wide',
              labelColor(resolved[key])
            )}
          >
            <span className="opacity-70">{dims[key]}</span>
            <span className="font-medium">{resolved[key]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
