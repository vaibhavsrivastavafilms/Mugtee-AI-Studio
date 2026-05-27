'use client'

import { cn } from '@/lib/utils'

export function CinematicRefineFocus({
  visible,
  line,
  className,
}: {
  visible: boolean
  line: string
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-center text-[9px] tracking-[0.2em] uppercase text-white/35 py-1 calm-opacity-transition',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {line}
    </p>
  )
}
