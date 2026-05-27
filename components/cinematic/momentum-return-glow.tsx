'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function MomentumReturnGlow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('momentum-return-glow rounded-[28px] calm-opacity-transition', className)}>
      {children}
    </div>
  )
}
