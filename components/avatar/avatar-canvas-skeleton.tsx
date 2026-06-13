'use client'

import { cn } from '@/lib/utils'

export function AvatarCanvasSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative h-full w-full rounded-full bg-gradient-to-b from-gold-500/20 via-gold-500/5 to-transparent animate-pulse',
        className
      )}
    />
  )
}
