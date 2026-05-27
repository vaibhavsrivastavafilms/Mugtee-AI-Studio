'use client'

import { cn } from '@/lib/utils'

export function CinematicFocusMarker({
  label = 'In focus',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[8px] tracking-[0.22em] uppercase text-[#C8A24E]/55',
        className
      )}
      aria-hidden
    >
      <span className="w-1 h-1 rounded-full bg-[#D4AF37]/60" />
      {label}
    </span>
  )
}
