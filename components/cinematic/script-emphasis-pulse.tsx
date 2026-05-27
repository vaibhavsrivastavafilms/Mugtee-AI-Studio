'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ScriptEmphasisPulse({
  active = false,
  children,
  className,
}: {
  active?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-opacity duration-300',
        active && 'script-emphasis-pulse emotional-focus-ring px-1 -mx-1',
        className
      )}
    >
      {children}
    </div>
  )
}
