'use client'

import { QuickCutHome } from '@/components/quick-cut/quick-cut-home'
import { LiveGenerationCanvas } from '@/components/quick-cut/canvas/live-generation-canvas'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export function QuickCutPreview({ embedded = true }: { embedded?: boolean }) {
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const studioReviewMode = useQuickCutGenerationStore((s) => s.studioReviewMode)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)

  const handleRegenerate = () => {
    resetQuickCutForFreshCreate()
  }

  if (isComplete && !studioReviewMode) {
    return <LiveGenerationCanvas onRegenerate={handleRegenerate} embedded={embedded} complete />
  }

  if (isGenerating || generationStep === 'error' || studioReviewMode) {
    return (
      <LiveGenerationCanvas
        onRegenerate={handleRegenerate}
        embedded={embedded}
        complete={isComplete}
      />
    )
  }

  return <QuickCutHome embedded={embedded} />
}
