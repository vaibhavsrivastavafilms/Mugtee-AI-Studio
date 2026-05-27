'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ImmersiveSessionFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative z-[1] immersive-session-fade',
        className
      )}
    >
      {children}
    </div>
  )
}
