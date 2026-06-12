'use client'

import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSubscriptionTier } from '@/hooks/use-subscription-tier'

type AdFreeBadgeProps = {
  className?: string
}

/** Shown in settings for PRO users — confirms ad-free experience. */
export function AdFreeBadge({ className }: AdFreeBadgeProps) {
  const { isAdFree } = useSubscriptionTier()

  if (!isAdFree) return null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-gold-500/25',
        'bg-gold-500/[0.08] px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-200/90',
        className
      )}
    >
      <Crown className="w-3.5 h-3.5" aria-hidden />
      Ad-Free Experience
    </div>
  )
}
