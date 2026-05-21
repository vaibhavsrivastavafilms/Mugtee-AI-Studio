'use client'
// MUGTEE V2.1 — Generate Images button.
//
// Wraps the per-scene image generation call. Renders inside the Flow / B-roll panel
// next to Regenerate. Loops sequentially over storyboard prompts, shows progress,
// and notifies parent via onComplete so the assets rail refreshes.
//
// EXTREME LOW CREDIT MODE: zero new deps.

import { useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function GenerateImagesButton({
  projectId,
  prompts,
  aspectRatio = '9:16',
  onComplete,
  className,
}: {
  projectId: string
  prompts: { type?: string; prompt: string }[]
  aspectRatio?: '9:16' | '1:1' | '16:9'
  onComplete?: () => void
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const run = async () => {
    const list = (prompts || []).map(p => String(p?.prompt || '').trim()).filter(Boolean).slice(0, 8)
    if (!list.length) { toast.error('Generate B-roll prompts first.'); return }
    if (busy) return
    setBusy(true); setProgress({ done: 0, total: list.length })
    let okCount = 0
    let firstError: string | null = null
    for (let i = 0; i < list.length; i++) {
      try {
        const r = await fetch('/api/ai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, prompt: list[i], aspect_ratio: aspectRatio }),
        })
        const d = await r.json()
        if (r.ok && d?.asset) {
          okCount++
          if (i === 0 || okCount % 2 === 0) onComplete?.()   // refresh midway so user sees progress
        } else {
          if (!firstError) firstError = d?.error || `Image ${i + 1} failed`
        }
      } catch (e: any) {
        if (!firstError) firstError = e?.message || 'Network error'
      }
      setProgress({ done: i + 1, total: list.length })
    }
    setBusy(false); setProgress(null)
    onComplete?.()
    if (okCount === 0) toast.error(firstError || 'No images generated')
    else if (okCount < list.length) toast.success(`Generated ${okCount}/${list.length} images`)
    else toast.success(`✨ Generated ${okCount} images`)
  }

  return (
    <button
      onClick={run}
      disabled={busy || !prompts?.length}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] tracking-wide transition min-h-[36px]',
        busy
          ? 'bg-gold-500/15 border border-gold-500/40 text-gold-200 cursor-wait'
          : (!prompts?.length
              ? 'bg-white/[0.03] border border-white/[0.05] text-muted-foreground cursor-not-allowed'
              : 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90'),
        className,
      )}
      title="Generate cinematic images from the storyboard prompts"
    >
      {busy ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {progress ? `${progress.done}/${progress.total}` : 'Generating…'}</>
      ) : (
        <><ImagePlus className="w-3.5 h-3.5" /> Generate Images</>
      )}
    </button>
  )
}
