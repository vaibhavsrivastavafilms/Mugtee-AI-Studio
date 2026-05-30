'use client'

import Link from 'next/link'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { LuxButton } from '@/components/v2/lux-button'
import { cn } from '@/lib/utils'

type V2EmptyStateProps = {
  title?: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
  className?: string
}

export function V2EmptyState({
  title = 'Your cinematic stories will appear here',
  description = 'Every generation auto-saves — reels, storyboards, and finished exports in one place.',
  ctaLabel = 'Create First Reel',
  ctaHref = '/create?mode=quick',
  className,
}: V2EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-8 sm:p-12 text-center',
        className
      )}
    >
      <MugteeOrb state="idle" size={64} useLogo className="mx-auto mb-5" />
      <p className="font-display text-xl text-[var(--v2-text-primary)] italic">{title}</p>
      <p className="mt-3 text-sm text-[var(--v2-text-secondary)] max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      <LuxButton href={ctaHref} className="mt-6">
        {ctaLabel}
      </LuxButton>
    </div>
  )
}
