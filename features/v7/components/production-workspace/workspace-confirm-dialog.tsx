'use client'

import { X } from 'lucide-react'

type WorkspaceConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  detail?: string | null
  confirmLabel: string
  cancelLabel?: string
  confirmTone?: 'danger' | 'neutral'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function WorkspaceConfirmDialog({
  open,
  title,
  description,
  detail,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmTone = 'neutral',
  busy = false,
  onConfirm,
  onCancel,
}: WorkspaceConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-confirm-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101010] p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id="workspace-confirm-title" className="text-lg font-semibold text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-white/75">{description}</p>
        {detail ? <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/60">{detail}</p> : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={
              confirmTone === 'danger'
                ? 'rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
                : 'rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
