'use client'

import type { ReactNode } from 'react'
import { DirectingDepthMask } from '@/components/cinematic/directing-depth-mask'
import { ImmersivePriorityLayer } from '@/components/cinematic/immersive-priority-layer'
import { cn } from '@/lib/utils'

export function CinematicFocusComposer({
  children,
  focused = true,
  className,
}: {
  children: ReactNode
  focused?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative visual-composition-weight', className)}>
      <DirectingDepthMask active={focused} />
      <ImmersivePriorityLayer active={focused}>{children}</ImmersivePriorityLayer>
    </div>
  )
}
