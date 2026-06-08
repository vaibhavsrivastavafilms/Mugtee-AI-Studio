'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { resolveDirectorCommentary } from '@/lib/quick-cut/director-commentary'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

type DirectorCommentaryPanelProps = {
  className?: string
}

export function DirectorCommentaryPanel({ className }: DirectorCommentaryPanelProps) {
  const input = useQuickCutGenerationStore(
    useShallow((s) => ({
      generationStep: s.generationStep,
      sectionStatus: s.sectionStatus,
      directingSceneLabel: s.directingSceneLabel,
      hookProgressLabel: s.hookProgressLabel,
      isRenderingVideo: s.isRenderingVideo,
      renderStatusLabel: s.renderStatusLabel,
      scenesCount: s.scenes.length,
      scenesWithImages: s.scenes.filter((sc) => sc.imageUrl?.trim()).length,
      isGenerating: s.isGenerating,
      generationInFlight: s.generationInFlight,
    }))
  )

  const commentary = useMemo(() => resolveDirectorCommentary(input), [input])

  if (!commentary || (!input.isGenerating && !input.generationInFlight && !input.isRenderingVideo)) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-[#D4AF37]/15 bg-[#D4AF37]/[0.04] px-3 py-2',
        className
      )}
    >
      <p className="text-[9px] tracking-[0.18em] uppercase text-gold-300/55 mb-1">Director Commentary</p>
      <p className="flex items-start gap-2 text-[11px] text-luxe/75 leading-snug">
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-gold-300/70 mt-0.5" aria-hidden />
        {commentary}
      </p>
    </div>
  )
}
