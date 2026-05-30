'use client'

import { cn } from '@/lib/utils'
import { isPublicBetaEnabled } from '@/lib/feature-flags/public-beta'

export function PublicBetaBadge({ className }: { className?: string }) {
  if (!isPublicBetaEnabled()) return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-[var(--v2-gold)]/35 bg-[var(--v2-gold)]/10 px-2 py-0.5',
        'text-[9px] sm:text-[10px] font-medium tracking-[0.18em] uppercase text-[var(--v2-gold)]/90',
        className
      )}
    >
      Public Beta
    </span>
  )
}
