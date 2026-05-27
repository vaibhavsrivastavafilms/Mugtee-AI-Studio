'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmotionalEnvironmentGlow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative emotional-environment-glow', className)}>
      {children}
    </div>
  )
}
