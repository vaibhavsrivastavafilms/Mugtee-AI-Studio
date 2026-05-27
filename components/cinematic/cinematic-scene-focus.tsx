'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CinematicSceneFocus({
  children,
  active = false,
  className,
}: {
  children: ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative z-[1] calm-opacity-transition',
        active ? 'opacity-100' : 'opacity-90',
        className
      )}
    >
      {children}
    </div>
  )
}
