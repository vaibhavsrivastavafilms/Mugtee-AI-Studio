'use client'

import { LockedFeatureCard } from '@/components/marketing/locked-feature-card'
import { cn } from '@/lib/utils'

/** Community layer stub — waitlist CTA, never empty. */
export function CommunityComingSoonCard({ className }: { className?: string }) {
  return (
    <LockedFeatureCard
      className={cn(className)}
      eyebrow="Creator Multiverse"
      title="Community & marketplace"
      description="Follow creators, share legendary projects, and trade templates — your HQ and story vault are the foundation."
      waitlistHref="/pricing"
      waitlistLabel="Join waitlist"
    />
  )
}
