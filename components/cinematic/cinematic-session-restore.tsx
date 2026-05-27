'use client'

import { useMemo } from 'react'
import { getSessionReturnLine } from '@/lib/creator/creator-identity'
import type { CinematicProjectStatus } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

export function CinematicSessionRestore({
  status,
  style,
  seed = 0,
  className,
}: {
  status: CinematicProjectStatus | string
  style?: string | null
  seed?: number
  className?: string
}) {
  const line = useMemo(
    () => getSessionReturnLine(status, style, seed),
    [status, style, seed]
  )

  return (
    <p
      className={cn(
        'text-center text-[10px] tracking-[0.22em] uppercase text-[#C8A24E]/65 immersive-workspace-fade',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
