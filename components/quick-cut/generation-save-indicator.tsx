'use client'

import { Check, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const LABELS = {
  idle: null,
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save issue — retry from library',
  resumed: 'Generation resumed',
  recovered: 'Recovered successfully',
} as const

export function GenerationSaveIndicator({ className }: { className?: string }) {
  const saveState = useQuickCutGenerationStore((s) => s.saveState)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)

  let label: string | null = LABELS[saveState] ?? null
  if (saveState === 'idle' && generationStatus === 'failed') {
    label = LABELS.recovered
  }
  if (isGenerating && saveState === 'resumed') {
    label = LABELS.resumed
  }

  if (!label) return null

  const Icon =
    saveState === 'saving'
      ? Loader2
      : saveState === 'error'
        ? RefreshCw
        : Check

  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-gold-300/70',
        className
      )}
      aria-live="polite"
    >
      <Icon
        className={cn(
          'h-3 w-3',
          saveState === 'saving' && 'animate-spin',
          saveState === 'error' && 'text-amber-400/80'
        )}
        aria-hidden
      />
      {label}
    </p>
  )
}
