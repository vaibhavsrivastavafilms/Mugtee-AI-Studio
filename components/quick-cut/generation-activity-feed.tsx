'use client'

import { useEffect, useMemo, useState } from 'react'
import { useClientMounted } from '@/lib/hooks/use-client-mounted'
import { Check, Loader2 } from 'lucide-react'
import {
  formatActivityElapsed,
  getGenerationActivityLog,
  syncGenerationActivityFromState,
} from '@/lib/quick-cut/generation-activity.client'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

type GenerationActivityFeedProps = {
  className?: string
  maxItems?: number
}

export function GenerationActivityFeed({ className, maxItems = 8 }: GenerationActivityFeedProps) {
  const mounted = useClientMounted()
  const [activityTick, setActivityTick] = useState(0)

  const input = useQuickCutGenerationStore(
    useShallow((s) => ({
      sectionStatus: s.sectionStatus,
      generationStep: s.generationStep,
      scenes: s.scenes,
      hook: s.hook,
      script: s.script,
      voiceUrl: s.voiceUrl,
      generationStartedAt: s.generationStartedAt,
      isGenerating: s.isGenerating,
      generationInFlight: s.generationInFlight,
    }))
  )

  useEffect(() => {
    if (!mounted || (!input.isGenerating && !input.generationInFlight)) return
    syncGenerationActivityFromState(input)
    setActivityTick((t) => t + 1)
  }, [mounted, input])

  const entries = useMemo(() => {
    if (!mounted) return []
    void input.generationStep
    void activityTick
    return getGenerationActivityLog().slice(-maxItems).reverse()
  }, [mounted, input.generationStep, input.sectionStatus, input.scenes.length, maxItems, activityTick])

  if (!mounted || entries.length === 0) return null

  return (
    <div className={cn('space-y-1.5', className)} aria-label="Recent activity">
      <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/45">Recent Activity</p>
      <ul className="space-y-1 max-h-[140px] overflow-y-auto scrollbar-luxe">
        {entries.map((entry) => (
          <li
            key={`${entry.id}-${entry.at}-${entry.status}`}
            className={cn(
              'flex items-center gap-2 text-[10px]',
              entry.status === 'completed' && 'text-emerald-100/80',
              entry.status === 'current' && 'text-gold-100/90'
            )}
          >
            {entry.status === 'completed' ? (
              <Check className="w-3 h-3 shrink-0 text-emerald-400/80" aria-hidden />
            ) : (
              <Loader2 className="w-3 h-3 shrink-0 animate-spin text-gold-300/80" aria-hidden />
            )}
            <span className="tabular-nums text-luxe/40 shrink-0">
              {formatActivityElapsed(entry.at, input.generationStartedAt)}
            </span>
            <span className="truncate">{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
