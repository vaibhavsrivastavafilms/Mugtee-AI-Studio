'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DirectingPresenceFade({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('immersive-environment-fade calm-opacity-transition', className)}>
      {children}
    </div>
  )
}
