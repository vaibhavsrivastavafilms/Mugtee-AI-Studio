'use client'

import { cn } from '@/lib/utils'

export function EmotionalFocusLock({
  active = true,
  className,
}: {
  active?: boolean
  className?: string
}) {
  if (!active) return null

  return (
    <div
      className={cn(
        'absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/12 to-transparent pointer-events-none',
        className
      )}
      aria-hidden
    />
  )
}
