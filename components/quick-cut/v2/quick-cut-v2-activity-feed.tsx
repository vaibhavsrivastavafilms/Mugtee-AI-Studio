'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClientMounted } from '@/lib/hooks/use-client-mounted'
import {
  getGenerationActivityLog,
  syncGenerationActivityFromState,
} from '@/lib/quick-cut/generation-activity.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'
import { useQuickCutProjectStatus } from '@/lib/quick-cut/use-quick-cut-project-status'

type QuickCutV2ActivityFeedProps = {
  className?: string
  maxItems?: number
}

export function QuickCutV2ActivityFeed({
  className,
  maxItems = 5,
}: QuickCutV2ActivityFeedProps) {
  const mounted = useClientMounted()
  const [tick, setTick] = useState(0)
  const { stageLabel, status } = useQuickCutProjectStatus()

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
      isRenderingVideo: s.isRenderingVideo,
      pipelineStatus: s.pipelineStatus,
    }))
  )

  useEffect(() => {
    if (!mounted || (!input.isGenerating && !input.generationInFlight)) return
    syncGenerationActivityFromState(input)
    setTick((t) => t + 1)
  }, [mounted, input])

  const entries = useMemo(() => {
    if (!mounted) return []
    void tick
    const log = getGenerationActivityLog().slice(-maxItems).reverse()
    if (log.length > 0) return log

    if (status === 'FAILED') {
      return [{ id: 'failed', label: 'Generation failed', status: 'current' as const, at: Date.now() }]
    }
    if (input.isGenerating || input.generationInFlight) {
      return [{ id: 'current', label: stageLabel, status: 'current' as const, at: Date.now() }]
    }
    return []
  }, [mounted, tick, maxItems, status, stageLabel, input.isGenerating, input.generationInFlight])

  if (entries.length === 0) return null

  return (
    <div className={cn('space-y-2', className)} aria-label="Live activity">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Live Activity</p>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={`${entry.id}-${entry.at}-${entry.status}`}
            className="flex items-center gap-2.5 text-sm text-white/80"
          >
            {entry.status === 'completed' ? (
              <Check className="w-4 h-4 shrink-0 text-[#D4AF37]" aria-hidden />
            ) : (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#E6C76A]" aria-hidden />
            )}
            <span className="truncate">{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
