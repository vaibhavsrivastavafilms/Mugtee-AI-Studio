'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmotionalGuidanceFade({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative z-[1] continuity-preservation-fade', className)}>
      {children}
    </div>
  )
}
