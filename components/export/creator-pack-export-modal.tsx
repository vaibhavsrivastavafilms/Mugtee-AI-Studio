'use client'

import { useEffect, useMemo } from 'react'
import { Download, Loader2, Package, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type CreatorPackModalPhase =
  | 'idle'
  | 'preparing'
  | 'packaging'
  | 'voice'
  | 'finalizing'
  | 'ready'
  | 'error'

const STEPS: { id: CreatorPackModalPhase; label: string }[] = [
  { id: 'preparing', label: 'Preparing Assets' },
  { id: 'packaging', label: 'Packaging Storyboards' },
  { id: 'voice', label: 'Bundling Voice' },
  { id: 'finalizing', label: 'Creating Creator Pack' },
]

function phaseFromProgress(progress: number, state: 'preparing' | 'ready' | 'error' | 'idle'): CreatorPackModalPhase {
  if (state === 'error') return 'error'
  if (state === 'ready') return 'ready'
  if (state === 'idle') return 'idle'
  if (progress >= 90) return 'finalizing'
  if (progress >= 65) return 'voice'
  if (progress >= 20) return 'packaging'
  return 'preparing'
}

type CreatorPackExportModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  progress: number
  exportState: 'idle' | 'preparing' | 'ready' | 'error'
  errorMessage?: string | null
  onDownload: () => void
  onOpenDirector?: () => void
}

export function CreatorPackExportModal({
  open,
  onOpenChange,
  progress,
  exportState,
  errorMessage,
  onDownload,
  onOpenDirector,
}: CreatorPackExportModalProps) {
  const phase = phaseFromProgress(progress, exportState)
  const activeIndex = useMemo(() => {
    const idx = STEPS.findIndex((s) => s.id === phase)
    if (phase === 'ready') return STEPS.length
    if (phase === 'error') return -1
    return idx < 0 ? 0 : idx
  }, [phase])

  useEffect(() => {
    if (exportState === 'ready' && open) {
      /* keep modal open for success actions */
    }
  }, [exportState, open])

  const showProgress = exportState === 'preparing'
  const showSuccess = exportState === 'ready'
  const showError = exportState === 'error'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-gold-500/20 bg-[#0a0a0a] text-luxe shadow-[0_24px_64px_rgba(0,0,0,0.65)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gold-100 text-base font-semibold tracking-wide">
            <Package className="w-4 h-4 text-gold-400" aria-hidden />
            {showSuccess ? 'Creator Pack Ready' : showError ? 'Export Failed' : 'Exporting Creator Pack'}
          </DialogTitle>
          <DialogDescription className="text-luxe/55 text-[12px]">
            {showSuccess
              ? 'Your script, storyboard, voice, and project files are bundled in one ZIP.'
              : showError
                ? errorMessage ?? 'Something went wrong while building the pack.'
                : 'Packaging assets for download — this stays on your device.'}
          </DialogDescription>
        </DialogHeader>

        {showProgress ? (
          <div className="space-y-4">
            <ol className="space-y-2">
              {STEPS.map((step, index) => {
                const done = index < activeIndex
                const active = index === activeIndex
                return (
                  <li
                    key={step.id}
                    className={cn(
                      'flex items-center gap-2 text-[11px] transition-colors',
                      done ? 'text-emerald-300/90' : active ? 'text-gold-200' : 'text-luxe/40'
                    )}
                  >
                    {done ? (
                      <Sparkles className="w-3 h-3 shrink-0" aria-hidden />
                    ) : active ? (
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" aria-hidden />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-luxe/25 shrink-0" />
                    )}
                    {step.label}
                  </li>
                )
              })}
            </ol>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gold-gradient transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="text-[10px] text-luxe/45 text-center tabular-nums">{progress}%</p>
          </div>
        ) : null}

        {showSuccess ? (
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gold-gradient px-4 py-2.5 text-[10px] font-semibold tracking-[0.14em] uppercase text-black shadow-gold-glow hover:opacity-90"
            >
              <Download className="w-3.5 h-3.5" aria-hidden />
              Download Package
            </button>
            {onOpenDirector ? (
              <button
                type="button"
                onClick={onOpenDirector}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] px-4 py-2 text-[10px] font-semibold tracking-[0.12em] uppercase text-gold-200 hover:bg-gold-500/10"
              >
                Open Director Mode
              </button>
            ) : null}
          </div>
        ) : null}

        {showError ? (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-luxe/70 hover:bg-white/[0.04]"
          >
            Close
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
