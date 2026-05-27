'use client'

import { cn } from '@/lib/utils'

/** Shared legacy presence line — opacity-only styling, reduced-motion safe. */
export function LegacyPresenceLine({
  line,
  className,
}: {
  line: string
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-[8px] tracking-[0.18em] uppercase text-white/28',
        className
      )}
      role="status"
    >
      {line}
    </p>
  )
}
