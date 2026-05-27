'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DirectingEnvironmentFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative z-[2] min-h-full emotional-production-glow visual-sequence-depth',
        className
      )}
    >
      {children}
    </div>
  )
}
