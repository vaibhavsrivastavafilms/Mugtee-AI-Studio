'use client'

import { Check, Cloud, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relSavedLabel } from '@/stores/cinematic-project'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type SaveStatusIndicatorProps = {
  className?: string
  /** Always show last known state (mobile trust bar) */
  persistent?: boolean
  compact?: boolean
  onRetry?: () => void
}

export function SaveStatusIndicator({
  className,
  persistent = false,
  compact = false,
  onRetry,
}: SaveStatusIndicatorProps) {
  const saveState = useQuickCutGenerationStore((s) => s.saveState)
  const saveError = useQuickCutGenerationStore((s) => s.saveError)
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const saveProject = useQuickCutGenerationStore((s) => s.saveProject)

  const syncedToCloud = Boolean(savedProjectId)
  const relative = relSavedLabel(lastSavedAt)

  let label: string | null = null
  let tone: 'neutral' | 'success' | 'warn' | 'active' = 'neutral'

  if (saveState === 'saving') {
    label = 'Saving…'
    tone = 'active'
  } else if (saveState === 'error') {
    label = saveError?.trim() || 'Save failed'
    tone = 'warn'
  } else if (saveState === 'saved') {
    label = syncedToCloud ? '✓ Synced to cloud' : '✓ Saved just now'
    tone = 'success'
  } else if (saveState === 'resumed') {
    label = 'Generation resumed'
    tone = 'success'
  } else if (saveState === 'idle' && generationStatus === 'failed') {
    label = 'Previous outputs safe'
    tone = 'success'
  } else if (persistent && lastSavedAt) {
    label = syncedToCloud ? '✓ Saved' : '✓ Saved locally'
    tone = 'success'
  } else if (persistent && isGenerating) {
    label = 'Saving as you go…'
    tone = 'active'
  }

  if (!label && !persistent) return null

  const Icon =
    saveState === 'saving'
      ? Loader2
      : saveState === 'error'
        ? RefreshCw
        : syncedToCloud
          ? Cloud
          : Check

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
      return
    }
    void saveProject()
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5',
        compact ? 'text-[9px]' : 'text-[10px]',
        'tracking-[0.18em] uppercase',
        tone === 'success' && 'text-gold-300/80',
        tone === 'warn' && 'text-amber-300/85',
        tone === 'active' && 'text-gold-300/70',
        tone === 'neutral' && 'text-luxe/50',
        className
      )}
      aria-live="polite"
    >
      <Icon
        className={cn(
          compact ? 'h-2.5 w-2.5' : 'h-3 w-3',
          saveState === 'saving' && 'animate-spin',
          saveState === 'error' && 'text-amber-400/90'
        )}
        aria-hidden
      />
      <span>{label ?? (persistent ? 'Ready' : '')}</span>
      {relative && saveState !== 'saving' && !compact ? (
        <span className="text-luxe/35 normal-case tracking-normal">· {relative}</span>
      ) : null}
      {saveState === 'error' ? (
        <button
          type="button"
          onClick={handleRetry}
          className="ml-1 text-[9px] tracking-[0.14em] uppercase text-amber-200/90 hover:text-amber-100 underline-offset-2 hover:underline"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}

/** @deprecated Use SaveStatusIndicator — kept for existing imports */
export function GenerationSaveIndicator(props: SaveStatusIndicatorProps) {
  return <SaveStatusIndicator {...props} />
}
