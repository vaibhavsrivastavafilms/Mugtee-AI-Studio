'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function MomentumTransition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('calm-opacity-transition cinematic-stage-transition', className)}>
      {children}
    </div>
  )
}
