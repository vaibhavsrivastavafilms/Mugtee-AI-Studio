'use client'

import { Cloud, Play } from 'lucide-react'
import { useGenerationJobResume } from '@/hooks/use-generation-job-resume'
import { cn } from '@/lib/utils'

type GenerationJobResumeBannerProps = {
  projectId?: string
  className?: string
}

/** Phase 6 — resume generation after refresh or on another device. */
export function GenerationJobResumeBanner({ projectId, className }: GenerationJobResumeBannerProps) {
  const { showBanner, label, progress, resume } = useGenerationJobResume(projectId)

  if (!showBanner) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-gold-500/25 bg-gold-500/[0.06] px-3 py-2.5 space-y-2',
        className
      )}
      role="status"
    >
      <div className="flex items-start gap-2">
        <Cloud className="w-4 h-4 text-gold-300/70 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.14em] uppercase text-gold-200/90">
            Background Generation
          </p>
          <p className="text-[11px] text-luxe/60 mt-0.5">
            {label ?? 'Generation paused'} — progress saved ({progress}%)
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={resume}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/35 bg-gold-500/15 px-3 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase text-gold-100 hover:bg-gold-500/25 transition-colors"
      >
        <Play className="w-3 h-3" aria-hidden />
        Continue on this device
      </button>
    </div>
  )
}
