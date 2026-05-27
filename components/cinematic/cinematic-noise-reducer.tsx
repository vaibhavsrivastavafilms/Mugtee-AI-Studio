'use client'

import type { ReactNode } from 'react'
import { VisualPriorityFade } from '@/components/cinematic/visual-priority-fade'
import { ImmersiveFocusGradient } from '@/components/cinematic/immersive-focus-gradient'
import { DirectingDepthMask } from '@/components/cinematic/directing-depth-mask'
import { cn } from '@/lib/utils'

export function CinematicNoiseReducer({
  children,
  focused = true,
  className,
}: {
  children: ReactNode
  focused?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative', !focused && 'visual-noise-reduction', className)}>
      <DirectingDepthMask active={focused} />
      <ImmersiveFocusGradient active={focused} />
      <VisualPriorityFade active={focused}>{children}</VisualPriorityFade>
    </div>
  )
}
