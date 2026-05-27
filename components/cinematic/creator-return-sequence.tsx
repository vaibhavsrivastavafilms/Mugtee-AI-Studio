'use client'

import type { ReactNode } from 'react'
import { CreatorToneMemory } from '@/components/cinematic/creator-tone-memory'
import { cn } from '@/lib/utils'

export function CreatorReturnSequence({
  children,
  style,
  niche,
  className,
}: {
  children: ReactNode
  style?: string | null
  niche?: string | null
  className?: string
}) {
  return (
    <div className={cn('immersive-workspace-fade', className)}>
      <CreatorToneMemory style={style} niche={niche} className="mb-3" />
      {children}
    </div>
  )
}
