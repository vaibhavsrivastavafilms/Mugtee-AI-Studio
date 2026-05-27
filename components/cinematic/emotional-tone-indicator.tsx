'use client'

import { cn } from '@/lib/utils'

export function EmotionalToneIndicator({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex px-2.5 py-1 rounded-full border border-[#D4AF37]/15 bg-[#2B1A08]/30 text-[8px] tracking-[0.2em] uppercase text-[#C8A24E]/65',
        className
      )}
    >
      {label}
    </span>
  )
}
