'use client'

import { cn } from '@/lib/utils'

export function CinematicIdentityBadge({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1.5 rounded-full border border-[#D4AF37]/20 bg-[#2B1A08]/40 text-[9px] tracking-[0.22em] uppercase text-[#C8A24E]/80 cinematic-identity-glow',
        className
      )}
    >
      {label}
    </span>
  )
}
