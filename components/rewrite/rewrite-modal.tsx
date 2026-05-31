'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { findRewriteAction } from '@/lib/rewrite/rewrite-actions'
import type { PendingRewrite } from '@/hooks/use-text-selection-rewrite'
import { cn } from '@/lib/utils'

export function RewriteModal({
  pending,
  onApply,
  onCancel,
}: {
  pending: PendingRewrite | null
  onApply: () => void
  onCancel: () => void
}) {
  const label = pending
    ? findRewriteAction(pending.variant, pending.contentType)?.label ?? 'Rewrite'
    : ''

  return (
    <AnimatePresence>
      {pending ? (
        <motion.div
          key="rewrite-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onCancel()
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'w-full max-w-lg rounded-2xl border border-gold-500/25',
              'bg-[#0a0a0c]/95 shadow-cinema backdrop-blur-xl overflow-hidden'
            )}
            role="dialog"
            aria-labelledby="rewrite-modal-title"
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
              <div>
                <p
                  id="rewrite-modal-title"
                  className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80"
                >
                  Director Edit Preview
                </p>
                <p className="text-sm text-luxe/90 mt-0.5">{label}</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-luxe transition"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 max-h-[min(60vh,420px)] overflow-y-auto scrollbar-luxe">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-luxe/45 mb-1.5">Original</p>
                <p className="text-[13px] leading-relaxed text-luxe/60 whitespace-pre-wrap">{pending.original}</p>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/70 mb-1.5">Rewritten</p>
                <p className="text-[13px] leading-relaxed text-[#F4E7C1] whitespace-pre-wrap font-serif">
                  {pending.replacement}
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-[11px] tracking-wide text-luxe/70 hover:text-luxe hover:bg-white/[0.04] transition"
              >
                Keep original
              </button>
              <button
                type="button"
                onClick={onApply}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] tracking-wide bg-gold-500/20 text-gold-200 border border-gold-500/30 hover:bg-gold-500/30 transition"
              >
                <Check className="w-3.5 h-3.5" />
                Apply rewrite
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
