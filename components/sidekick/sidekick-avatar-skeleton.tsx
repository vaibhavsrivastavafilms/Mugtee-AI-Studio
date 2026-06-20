'use client'

import { cn } from '@/lib/utils'

export function SidekickAvatarSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative z-10 h-full w-full rounded-full bg-gradient-to-b from-gold-500/20 to-transparent animate-pulse',
        className
      )}
    />
  )
}
