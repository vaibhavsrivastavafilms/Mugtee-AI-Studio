'use client'

import { LiveGenerationCanvas } from '@/components/quick-cut/canvas/live-generation-canvas'

export function ReelRenderPreview({
  onRegenerate,
  embedded = false,
  className,
}: {
  onRegenerate?: () => void
  embedded?: boolean
  className?: string
}) {
  return (
    <LiveGenerationCanvas
      onRegenerate={onRegenerate}
      embedded={embedded}
      complete
      className={className}
    />
  )
}
