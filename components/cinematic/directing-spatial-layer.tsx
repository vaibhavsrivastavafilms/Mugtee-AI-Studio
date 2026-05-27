'use client'

import { cn } from '@/lib/utils'

export function DirectingSpatialLayer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_100%,rgba(0,0,0,0.45),transparent_70%)]',
        className
      )}
      aria-hidden
    />
  )
}
