'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  REWRITE_MIN_SELECTION_CHARS,
  type RewriteContentType,
  type RewriteContext,
  type RewriteVariant,
} from '@/lib/rewrite/rewrite-actions'
import { requestRewriteSelection } from '@/lib/rewrite/rewrite-api'

export type SelectionRewriteState = {
  text: string
  contentType: RewriteContentType
  position: { top: number; left: number }
}

export type PendingRewrite = {
  original: string
  replacement: string
  variant: RewriteVariant
  contentType: RewriteContentType
}

type UseTextSelectionRewriteOptions = {
  containerRef: React.RefObject<HTMLElement | null>
  defaultContentType?: RewriteContentType
  context?: RewriteContext
  enabled?: boolean
  minChars?: number
}

function detectContentType(node: Node | null): RewriteContentType {
  let el: Element | null =
    node instanceof Element ? node : node?.parentElement ?? null
  while (el) {
    const typed = el.getAttribute('data-rewrite-type')
    if (
      typed === 'hook' ||
      typed === 'script' ||
      typed === 'scene' ||
      typed === 'caption' ||
      typed === 'visual_direction'
    ) {
      return typed
    }
    el = el.parentElement
  }
  return 'script'
}

function computeToolbarPosition(range: Range): { top: number; left: number } {
  const rect = range.getBoundingClientRect()
  const top = Math.max(8, rect.top - 56)
  const left = Math.max(8, Math.min(window.innerWidth - 380, rect.left + rect.width / 2 - 190))
  return { top, left }
}

export function useTextSelectionRewrite({
  containerRef,
  defaultContentType = 'script',
  context = {},
  enabled = true,
  minChars = REWRITE_MIN_SELECTION_CHARS,
}: UseTextSelectionRewriteOptions) {
  const [selection, setSelection] = useState<SelectionRewriteState | null>(null)
  const [busyVariant, setBusyVariant] = useState<RewriteVariant | null>(null)
  const [pending, setPending] = useState<PendingRewrite | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearSelection = useCallback(() => {
    setSelection(null)
    setError(null)
    try {
      window.getSelection()?.removeAllRanges()
    } catch {
      /* ignore */
    }
  }, [])

  const readSelection = useCallback(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(null)
      return
    }

    const range = sel.getRangeAt(0)
    if (!container.contains(range.commonAncestorContainer)) {
      setSelection(null)
      return
    }

    const text = sel.toString().trim()
    if (text.length < minChars) {
      setSelection(null)
      return
    }

    const rect = range.getBoundingClientRect()
    if (!rect || rect.width === 0) {
      setSelection(null)
      return
    }

    setSelection({
      text,
      contentType: detectContentType(range.commonAncestorContainer),
      position: computeToolbarPosition(range),
    })
  }, [containerRef, enabled, minChars])

  useEffect(() => {
    if (!enabled) return
    const onMouseUp = () => window.setTimeout(readSelection, 10)
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight') readSelection()
    }
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [enabled, readSelection])

  useEffect(() => {
    if (!selection) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, clearSelection])

  const runRewrite = useCallback(
    async (variant: RewriteVariant, skipPreview = false) => {
      if (!selection || busyVariant) return null
      setBusyVariant(variant)
      setError(null)
      try {
        const contentType = selection.contentType || defaultContentType
        const result = await requestRewriteSelection(selection.text, variant, {
          ...context,
          content_type: contentType,
        })
        const pendingRewrite: PendingRewrite = {
          original: selection.text,
          replacement: result.output,
          variant,
          contentType,
        }
        if (skipPreview) {
          clearSelection()
          return pendingRewrite
        }
        setPending(pendingRewrite)
        return pendingRewrite
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Rewrite failed'
        setError(message)
        return null
      } finally {
        setBusyVariant(null)
      }
    },
    [selection, busyVariant, context, defaultContentType, clearSelection]
  )

  const confirmPending = useCallback(() => {
    const value = pending
    setPending(null)
    clearSelection()
    return value
  }, [pending, clearSelection])

  const dismissPending = useCallback(() => {
    setPending(null)
  }, [])

  return {
    selection,
    busyVariant,
    pending,
    error,
    clearSelection,
    runRewrite,
    confirmPending,
    dismissPending,
  }
}
