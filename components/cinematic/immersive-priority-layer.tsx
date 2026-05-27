'use client'

import type { ReactNode } from 'react'
import { VisualPriorityFade } from '@/components/cinematic/visual-priority-fade'
import { ImmersiveFocusGradient } from '@/components/cinematic/immersive-focus-gradient'
import { cn } from '@/lib/utils'

export function ImmersivePriorityLayer({
  children,
  active = true,
  className,
}: {
  children: ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative', !active && 'cinematic-attention-weight-muted', className)}>
      <ImmersiveFocusGradient active={active} />
      <VisualPriorityFade active={active}>{children}</VisualPriorityFade>
    </div>
  )
}
