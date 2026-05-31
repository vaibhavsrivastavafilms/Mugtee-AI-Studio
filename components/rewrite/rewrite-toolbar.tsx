'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Wand2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  type RewriteContentType,
  type RewriteContext,
  type RewriteVariant,
  findRewriteAction,
} from '@/lib/rewrite/rewrite-actions'
import { useTextSelectionRewrite } from '@/hooks/use-text-selection-rewrite'
import { RewriteActionMenu } from '@/components/rewrite/rewrite-action-menu'
import { RewriteModal } from '@/components/rewrite/rewrite-modal'

export type RewriteReplacePayload = {
  original: string
  replacement: string
  variant: RewriteVariant
  contentType: RewriteContentType
}

export function RewriteToolbar({
  containerRef,
  context,
  onReplace,
  enabled = true,
  previewBeforeReplace = true,
  defaultContentType = 'script',
}: {
  containerRef: React.RefObject<HTMLElement | null>
  context?: RewriteContext
  onReplace: (payload: RewriteReplacePayload) => void | Promise<void>
  enabled?: boolean
  previewBeforeReplace?: boolean
  defaultContentType?: RewriteContentType
}) {
  const {
    selection,
    busyVariant,
    pending,
    error,
    clearSelection,
    runRewrite,
    confirmPending,
    dismissPending,
  } = useTextSelectionRewrite({
    containerRef,
    context,
    enabled,
    defaultContentType,
  })

  const applyRewrite = useCallback(
    async (payload: RewriteReplacePayload) => {
      await onReplace(payload)
      const label = findRewriteAction(payload.variant, payload.contentType)?.label
      toast.success(label ? `Rewritten · ${label}` : 'Rewrite applied')
    },
    [onReplace]
  )

  const handleAction = useCallback(
    async (variant: RewriteVariant) => {
      const result = await runRewrite(variant, !previewBeforeReplace)
      if (result && !previewBeforeReplace) {
        await applyRewrite(result)
      }
    },
    [runRewrite, previewBeforeReplace, applyRewrite]
  )

  const handleApplyPreview = useCallback(async () => {
    const value = confirmPending()
    if (value) await applyRewrite(value)
  }, [confirmPending, applyRewrite])

  return (
    <>
      <RewriteModal pending={pending} onApply={() => void handleApplyPreview()} onCancel={dismissPending} />

      <AnimatePresence>
        {selection && !pending ? (
          <motion.div
            key="rewrite-toolbar"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: selection.position.top,
              left: selection.position.left,
              zIndex: 60,
            }}
            className={cn(
              'rounded-xl glass-strong border border-gold-soft shadow-cinema px-1.5 py-1.5',
              'flex items-center gap-0.5'
            )}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="hidden sm:inline-flex items-center gap-1 px-2 text-[10px] tracking-[0.25em] uppercase text-gold-300/80 border-r border-white/[0.06] mr-1 shrink-0">
              {busyVariant ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              Director Edit
            </span>

            <RewriteActionMenu
              contentType={selection.contentType}
              busyVariant={busyVariant}
              disabled={Boolean(busyVariant)}
              onAction={(variant) => void handleAction(variant)}
            />

            <button
              type="button"
              onClick={clearSelection}
              disabled={Boolean(busyVariant)}
              className="ml-1 p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground hover:text-luxe transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center shrink-0"
              title="Dismiss (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[61] pointer-events-none">
          <p className="text-[11px] text-rose-300/90 bg-black/80 px-3 py-1.5 rounded-lg border border-rose-500/20">
            {error}
          </p>
        </div>
      ) : null}
    </>
  )
}

/** Re-export legacy variant type for callers migrating from script/rewrite-toolbar */
export type { RewriteVariant } from '@/lib/rewrite/rewrite-actions'
