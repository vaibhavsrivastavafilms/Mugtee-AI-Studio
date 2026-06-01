'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

export function StoryEvolutionPresenceLine({
  line,
  className,
}: {
  line: string
  className?: string
}) {
  return (
    <p
      className={cn('text-[8px] tracking-[0.18em] uppercase text-white/26', className)}
      role="status"
    >
      {line}
    </p>
  )
}

export function useEvolutionLine(
  resolver: (...args: never[]) => string,
  deps: readonly unknown[]
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps tuple is the call-site dependency list
  return useMemo(() => resolver(...(deps as never[])), deps)
}
