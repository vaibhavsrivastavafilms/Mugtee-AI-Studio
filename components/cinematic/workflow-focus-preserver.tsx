'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { getEmotionalFlowMarker } from '@/lib/creator/flow-state-copy'
import { cn } from '@/lib/utils'

export function WorkflowFocusPreserver({ className }: { className?: string }) {
  const pathname = usePathname()
  const stage = pathname?.split('/').pop() || 'create'
  const marker = useMemo(
    () => getEmotionalFlowMarker(stage, stage.length % 3),
    [stage]
  )

  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/28 text-center mb-4 hidden sm:block emotional-rhythm-breathing',
        className
      )}
      role="status"
    >
      {marker}
    </p>
  )
}
