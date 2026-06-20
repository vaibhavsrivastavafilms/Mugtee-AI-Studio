'use client'

import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Non-blocking badge when script step used deterministic mock data. */
export function MockScriptBadge({ className }: { className?: string }) {
  const scriptUsedMock = useQuickCutGenerationStore((s) => s.scriptUsedMock)

  if (!scriptUsedMock) return null

  return (
    <div
      className={cn(
        'inline-flex flex-col items-start rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-left pointer-events-none',
        className
      )}
      aria-label="Development mock script active"
    >
      <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-amber-200/95">
        Using Mock Script
      </span>
      <span className="text-[9px] tracking-[0.1em] uppercase text-amber-200/55">
        Development Mode
      </span>
    </div>
  )
}
