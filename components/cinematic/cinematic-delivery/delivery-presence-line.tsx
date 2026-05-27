'use client'

import { cn } from '@/lib/utils'

export function DeliveryPresenceLine({
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
