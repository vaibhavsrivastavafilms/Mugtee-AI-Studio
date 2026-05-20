'use client'
// Phase V1.2 — Highlight + Rewrite floating toolbar.
//
// Lightweight, dependency-free (uses native window.getSelection + DOMRect).
// Behaviour:
//   1. Listens for selection changes inside `containerRef`
//   2. When the selection is non-empty + lives inside the container, renders a
//      floating gold toolbar near the selection with 5 rewrite buttons
//   3. On button click → calls /api/ai/generate with mode='rewrite_selection'
//      → returns the rewritten passage → fires onReplace(originalText, newText)
//   4. Caller handles the actual text swap + version history snapshot
//
// EXTREME LOW CREDIT MODE: zero new deps, no editor framework, ~140 lines total.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Sparkles, Scissors, Heart, Film, Megaphone, Loader2, X, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export type RewriteVariant = 'more_viral' | 'shorter' | 'emotional' | 'documentary' | 'cta'

interface RewriteContext {
  title?: string
  platform?: string
  niche?: string
  tone?: string
  full_script?: string
}

const VARIANTS: { id: RewriteVariant; label: string; icon: any; tone: string }[] = [
  { id: 'more_viral',  label: 'More Viral',   icon: Sparkles,  tone: 'text-gold-300' },
  { id: 'shorter',     label: 'Shorter',      icon: Scissors,  tone: 'text-rose-300' },
  { id: 'emotional',   label: 'Emotional',    icon: Heart,     tone: 'text-pink-300' },
  { id: 'documentary', label: 'Documentary',  icon: Film,      tone: 'text-amber-200' },
  { id: 'cta',         label: 'Better CTA',   icon: Megaphone, tone: 'text-emerald-300' },
]

export function RewriteToolbar({
  containerRef,
  context,
  onReplace,
}: {
  containerRef: React.RefObject<HTMLElement>
  context: RewriteContext
  onReplace: (originalText: string, newText: string, variant: RewriteVariant) => void
}) {
  const [selection, setSelection] = useState<string>('')
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [busy, setBusy] = useState<RewriteVariant | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Track the current selection. We re-read it on selectionchange + on mouseup.
  useEffect(() => {
    const compute = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setSelection(''); setPos(null); return }
      const range = sel.getRangeAt(0)
      const container = containerRef.current
      if (!container) return
      // Ignore selections outside the script body.
      if (!container.contains(range.commonAncestorContainer)) { setSelection(''); setPos(null); return }
      const text = sel.toString().trim()
      if (text.length < 12) { setSelection(''); setPos(null); return }  // ignore tiny selections
      const rect = range.getBoundingClientRect()
      if (!rect || rect.width === 0) { setSelection(''); setPos(null); return }
      setSelection(text)
      // Position above the selection. Clamp to viewport. `position: fixed` → use raw rect coords (no scroll offset).
      const top = Math.max(8, rect.top - 56)
      const left = Math.max(8, Math.min(window.innerWidth - 360, rect.left + rect.width / 2 - 180))
      setPos({ top, left })
    }
    // Use mouseup/keyup so we don't fire during drag — only after release.
    const onMouseUp = () => setTimeout(compute, 10)
    const onKeyUp = (e: KeyboardEvent) => { if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight') compute() }
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [containerRef])

  // Close on Escape
  useEffect(() => {
    if (!selection) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelection(''); setPos(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection])

  const rewrite = async (variant: RewriteVariant) => {
    if (busy) return
    const original = selection
    if (!original) return
    setBusy(variant)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'rewrite_selection',
          context: {
            selection: original,
            rewrite_variant: variant,
            full_script: context.full_script,
            title: context.title,
            platform: context.platform,
            niche: context.niche,
            tone: context.tone,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) { toast.error(data?.error || 'Rewrite failed'); return }
      const newText = String(data.output || data.raw || '').trim()
      if (!newText) { toast.error('Empty rewrite returned'); return }
      onReplace(original, newText, variant)
      toast.success(`✨ Rewritten · ${VARIANTS.find(v => v.id === variant)?.label}`)
      setSelection(''); setPos(null)
      try { window.getSelection()?.removeAllRanges() } catch {}
    } catch (e: any) {
      toast.error(e?.message || 'Network error')
    } finally {
      setBusy(null)
    }
  }

  if (!selection || !pos) return null

  return (
    <div
      ref={toolbarRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 60 }}
      className="rounded-xl glass-strong border border-gold-soft shadow-cinema px-1.5 py-1.5 flex items-center gap-0.5 animate-in fade-in slide-in-from-bottom-1 duration-150"
      // Prevent the toolbar's mousedown from clearing the selection.
      onMouseDown={e => e.preventDefault()}
    >
      <span className="hidden sm:inline-flex items-center gap-1 px-2 text-[10px] tracking-[0.25em] uppercase text-gold-300/80 border-r border-white/[0.06] mr-1">
        <Wand2 className="w-3 h-3" /> Rewrite
      </span>
      {VARIANTS.map(v => {
        const Icon = v.icon
        const isBusy = busy === v.id
        return (
          <button
            key={v.id}
            onClick={() => rewrite(v.id)}
            disabled={!!busy}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] tracking-wide transition min-h-[36px]',
              isBusy ? 'bg-white/[0.06] cursor-wait'
                : busy ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-gold-500/15 hover:text-gold-200 text-luxe/85',
            )}
            title={`Rewrite selection · ${v.label}`}
          >
            {isBusy ? <Loader2 className={cn('w-3.5 h-3.5 animate-spin', v.tone)} /> : <Icon className={cn('w-3.5 h-3.5', v.tone)} />}
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        )
      })}
      <button
        onClick={() => { setSelection(''); setPos(null); try { window.getSelection()?.removeAllRanges() } catch {} }}
        disabled={!!busy}
        className="ml-1 p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground hover:text-luxe transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
        title="Dismiss (Esc)"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
