'use client'

import { cn } from '@/lib/utils'

export function PacingPresenceChip({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex px-2.5 py-1 rounded-full border border-white/[0.08] bg-black/30 text-[8px] tracking-[0.2em] uppercase text-white/45',
        className
      )}
    >
      {label}
    </span>
  )
}
