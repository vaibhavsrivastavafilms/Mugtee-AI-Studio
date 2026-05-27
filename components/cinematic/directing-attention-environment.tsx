'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DirectingAttentionEnvironment({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative cinematic-editorial-spacing', className)}>
      {children}
    </div>
  )
}
