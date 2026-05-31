'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type OutputQualityState = {
  hookGenerated: boolean
  storyboardReady: boolean
  captionReady: boolean
  exportReady: boolean
}

const BADGE_ITEMS: {
  key: keyof OutputQualityState
  label: string
}[] = [
  { key: 'hookGenerated', label: 'Hook Generated' },
  { key: 'storyboardReady', label: 'Storyboard Ready' },
  { key: 'captionReady', label: 'Caption Ready' },
  { key: 'exportReady', label: 'Export Ready' },
]

export function OutputQualityBadges({
  state,
  className,
}: {
  state: OutputQualityState
  className?: string
}) {
  const readyCount = BADGE_ITEMS.filter((item) => state[item.key]).length
  if (readyCount === 0) return null

  return (
    <div
      className={cn('flex flex-wrap justify-center gap-2', className)}
      aria-label="Output quality highlights"
    >
      {BADGE_ITEMS.map((item) => {
        const ready = state[item.key]
        return (
          <Badge
            key={item.key}
            variant="outline"
            className={cn(
              'gap-1.5 border px-2.5 py-1 text-[9px] tracking-[0.14em] uppercase font-medium',
              ready
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200/90'
                : 'border-white/[0.08] bg-black/30 text-luxe/35'
            )}
          >
            {ready ? (
              <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden />
            ) : (
              <Circle className="w-3 h-3 shrink-0 opacity-40" aria-hidden />
            )}
            {item.label}
          </Badge>
        )
      })}
    </div>
  )
}
