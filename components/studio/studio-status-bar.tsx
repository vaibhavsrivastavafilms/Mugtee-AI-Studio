'use client'

import { GenerationSaveIndicator } from '@/components/quick-cut/generation-save-indicator'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { relSavedLabel } from '@/stores/cinematic-project'

export function StudioStatusBar({ className }: { className?: string }) {
  const saveState = useQuickCutGenerationStore((s) => s.saveState)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)

  const syncing = isGenerating && saveState !== 'saving'
  const lastSaved = relSavedLabel(lastSavedAt)

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-3 py-2 rounded-xl',
        'border border-white/[0.06] bg-black/40 backdrop-blur-md',
        className
      )}
    >
      <p className="text-[10px] tracking-[0.22em] uppercase text-luxe/45">
        Command Center
      </p>
      <div className="flex items-center gap-3">
        {syncing ? (
          <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/60">
            Syncing…
          </span>
        ) : null}
        {generationStatus === 'generating' && !syncing ? (
          <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/60">
            Generating…
          </span>
        ) : null}
        <GenerationSaveIndicator />
        {lastSaved && saveState !== 'saving' ? (
          <span className="text-[10px] tracking-[0.16em] uppercase text-luxe/40">
            {lastSaved}
          </span>
        ) : null}
      </div>
    </div>
  )
}
