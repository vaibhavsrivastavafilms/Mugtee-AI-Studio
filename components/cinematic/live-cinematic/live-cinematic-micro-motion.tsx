'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function MotionBreathing({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('live-motion-breathing', className)} style={{ animationDuration: '4.2s' }}>
      {children}
    </div>
  )
}

export function FilmImmersionFade({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('live-film-opacity', className)} style={{ animationDuration: '320ms' }}>
      {children}
    </div>
  )
}
