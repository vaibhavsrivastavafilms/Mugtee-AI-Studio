'use client'

import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type ExportHubProps = {
  className?: string
}

export function ExportHub({ className }: ExportHubProps) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)

  if (!hook && !script) return null

  return (
    <section
      id="output-export-hub"
      className={cn(
        'rounded-xl border border-gold-500/15 bg-black/45 p-4 space-y-2',
        className
      )}
      aria-label="Export hub"
    >
      <div>
        <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/75">Export hub</p>
        <p className="text-[11px] text-luxe/50 mt-0.5 italic">
          Copy or download hook, script, and captions — use the Download menu in export assets
          above.
        </p>
      </div>
    </section>
  )
}
