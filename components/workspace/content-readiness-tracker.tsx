'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  deriveContentReadiness,
  type ContentReadinessState,
} from '@/lib/workspace/output-workspace-utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const READINESS_ITEMS: { key: keyof ContentReadinessState; label: string }[] = [
  { key: 'hookReady', label: 'Hook Ready' },
  { key: 'scriptReady', label: 'Script Ready' },
  { key: 'storyboardReady', label: 'Storyboard Ready' },
  { key: 'captionReady', label: 'Caption Ready' },
  { key: 'thumbnailReady', label: 'Thumbnail Ready' },
]

export function deriveContentReadinessFromStore(): ContentReadinessState {
  const state = useQuickCutGenerationStore.getState()
  return deriveContentReadiness({
    hook: state.hook,
    script: state.script,
    scenes: state.scenes,
    cta: state.cta,
    payoff: state.payoff,
    title: state.title,
    visualStyleLabel: state.visualStyle?.label ?? null,
  })
}

export function ContentReadinessTracker({ className }: { className?: string }) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const title = useQuickCutGenerationStore((s) => s.title)
  const visualStyle = useQuickCutGenerationStore((s) => s.visualStyle)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)

  const readiness = deriveContentReadiness({
    hook,
    script,
    scenes,
    cta,
    payoff,
    title,
    visualStyleLabel: visualStyle?.label ?? null,
  })

  const readyCount = READINESS_ITEMS.filter((item) => readiness[item.key]).length
  if (!savedProjectId && !hook && !script) return null

  return (
    <section
      className={cn(
        'rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-2.5',
        className
      )}
      aria-label="Content readiness"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/70">
          Project status
        </p>
        <span className="text-[10px] text-luxe/45 tabular-nums">
          {readyCount}/{READINESS_ITEMS.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {READINESS_ITEMS.map((item) => {
          const ready = readiness[item.key]
          return (
            <Badge
              key={item.key}
              variant="outline"
              className={cn(
                'gap-1.5 border px-2.5 py-1 text-[9px] tracking-[0.12em] uppercase font-medium',
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
    </section>
  )
}
