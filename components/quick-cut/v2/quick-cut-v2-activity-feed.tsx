'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClientMounted } from '@/lib/hooks/use-client-mounted'
import {
  getGenerationActivityLog,
  syncGenerationActivityFromState,
} from '@/lib/quick-cut/generation-activity.client'
import {
  subscribeProductionOsV2Events,
  getProductionOsV2Events,
} from '@/lib/production-os/v2/event-bus.client'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'
import { useQuickCutProjectStatus } from '@/lib/quick-cut/use-quick-cut-project-status'

type QuickCutV2ActivityFeedProps = {
  className?: string
  maxItems?: number
}

export function QuickCutV2ActivityFeed({
  className,
  maxItems = 6,
}: QuickCutV2ActivityFeedProps) {
  const mounted = useClientMounted()
  const [tick, setTick] = useState(0)
  const { stageLabel, status, savedProjectId } = useQuickCutProjectStatus()

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

  // Subscribe to in-process V2 events + SSE from backend
  useEffect(() => {
    if (!mounted) return
    const unsub = subscribeProductionOsV2Events(() => setTick((t) => t + 1))

    const projectId = savedProjectId
    const url = projectId
      ? `/api/production-os/events?projectId=${encodeURIComponent(projectId)}`
      : '/api/production-os/events'
    const es = new EventSource(url)
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as { type?: string }
        if (data.type === 'event') setTick((t) => t + 1)
      } catch {
        /* ignore */
      }
    }
    return () => {
      unsub()
      es.close()
    }
  }, [mounted, savedProjectId])

  const entries = useMemo(() => {
    if (!mounted) return []
    void tick
    const fromLog = getGenerationActivityLog()
    const fromEvents = getProductionOsV2Events().map((e) => ({
      id: e.id,
      label: e.message,
      status:
        e.status === 'completed' || e.status === 'skipped' || e.status === 'failed'
          ? ('completed' as const)
          : ('current' as const),
      at: e.at,
    }))

    const merged = [...fromLog, ...fromEvents]
      .sort((a, b) => a.at - b.at)
      .slice(-maxItems)
      .reverse()

    if (merged.length > 0) return merged

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
