'use client'

import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

export type DraftAssetKind = 'hook' | 'script' | 'scenes'

type DraftProtectionDialogProps = {
  open: boolean
  assetKind: DraftAssetKind
  onKeepExisting: () => void
  onCreateNewVersion: () => void
  onClose: () => void
}

const ASSET_LABEL: Record<DraftAssetKind, string> = {
  hook: 'hook',
  script: 'script',
  scenes: 'scenes',
}

export function DraftProtectionDialog({
  open,
  assetKind,
  onKeepExisting,
  onCreateNewVersion,
  onClose,
}: DraftProtectionDialogProps) {
  if (!open) return null

  const label = ASSET_LABEL[assetKind]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-protection-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-md rounded-2xl border border-gold-500/25',
          'bg-gradient-to-b from-zinc-900/95 to-black/95 p-6 shadow-2xl space-y-4'
        )}
      >
        <div className="space-y-1.5">
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">
            Draft protection
          </p>
          <h2
            id="draft-protection-title"
            className="font-display text-xl text-[#F4E7C1] italic leading-snug"
          >
            Regenerate {label}?
          </h2>
          <p className="text-sm text-luxe/65 leading-relaxed">
            Your current {label} is saved. Choose whether to keep it or start a new version.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onKeepExisting}
            className="flex-1 min-h-[44px] rounded-xl border border-gold-500/30 text-gold-200/90 text-[11px] font-semibold tracking-[0.12em] uppercase hover:bg-gold-500/[0.08] transition-colors"
          >
            Keep Existing Version
          </button>
          <button
            type="button"
            onClick={onCreateNewVersion}
            className="flex-1 min-h-[44px] rounded-xl bg-gold-gradient text-black text-[11px] font-semibold tracking-[0.12em] uppercase shadow-gold-glow"
          >
            Create New Version
          </button>
        </div>
      </div>
    </div>
  )
}

type PendingRegen = {
  kind: DraftAssetKind
  resolve: (mode: 'keep' | 'new' | 'cancel') => void
}

/** Prompt before overwriting hook/script/scenes — returns whether to proceed. */
export function useDraftRegenerationGuard() {
  const [pending, setPending] = useState<PendingRegen | null>(null)

  const requestRegeneration = useCallback(
    (kind: DraftAssetKind): Promise<'keep' | 'new' | 'cancel'> =>
      new Promise((resolve) => {
        setPending({ kind, resolve })
      }),
    []
  )

  const close = useCallback(() => {
    pending?.resolve('cancel')
    setPending(null)
  }, [pending])

  const dialog = pending ? (
    <DraftProtectionDialog
      open
      assetKind={pending.kind}
      onClose={close}
      onKeepExisting={() => {
        pending.resolve('keep')
        setPending(null)
      }}
      onCreateNewVersion={() => {
        pending.resolve('new')
        setPending(null)
      }}
    />
  ) : null

  return { requestRegeneration, dialog }
}
