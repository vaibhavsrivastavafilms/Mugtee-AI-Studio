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
import { logEvent } from '@/lib/log-event'
import { rememberWorkspace } from '@/lib/last-workspace'

export function GenerateImagesButton({
  projectId,
  prompts,
  aspectRatio = '9:16',
  /** V3.6 — Visual Consistency Lock. Style summary applied to every frame. */
  styleLock,
  onComplete,
  className,
}: {
  projectId: string
  prompts: { type?: string; prompt: string; narration_line?: string; camera_direction?: string; emotional_tone?: string; duration_seconds?: number; sequence_index?: number }[]
  aspectRatio?: '9:16' | '1:1' | '16:9'
  styleLock?: string
  onComplete?: () => void
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const run = async () => {
    const list = (prompts || []).filter(p => String(p?.prompt || '').trim()).slice(0, 8)
    if (!list.length) { toast.error('Generate B-roll prompts first.'); return }
    if (busy) return
    setBusy(true); setProgress({ done: 0, total: list.length })
    let okCount = 0
    let firstError: string | null = null
    for (let i = 0; i < list.length; i++) {
      const p = list[i]
      try {
        const r = await fetch('/api/ai/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id:       projectId,
            prompt:           String(p.prompt).trim(),
            aspect_ratio:     aspectRatio,
            // V3.6 — Visual Consistency Lock + per-frame direction.
            style_lock:       styleLock || undefined,
            scene_type:       p.type || undefined,
            camera_direction: p.camera_direction || undefined,
            emotional_tone:   p.emotional_tone || undefined,
            narration_line:   p.narration_line || undefined,
            sequence_index:   typeof p.sequence_index === 'number' ? p.sequence_index : i + 1,
          }),
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
    // V3.5 — Creator Memory: log image generation summary for the project timeline.
    if (okCount > 0) {
      logEvent({
        event_type: 'image_generated',
        project_id: projectId,
        metadata: { count: okCount, total_requested: list.length, aspect_ratio: aspectRatio },
      })
      rememberWorkspace(projectId, undefined, { stage: 'visuals', last_event: 'image_generated' })
    }
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
