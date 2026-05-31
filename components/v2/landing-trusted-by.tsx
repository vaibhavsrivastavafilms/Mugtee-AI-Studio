'use client'

import { cn } from '@/lib/utils'

const MEDIA_OUTLETS = [
  'Forbes',
  'Creator Economy',
  'Benzinga',
  'Yahoo Finance',
  'Business Insider',
] as const

export function LandingTrustedBy({ className }: { className?: string }) {
  return (
    <section className={cn('px-5 sm:px-6 py-10 sm:py-12', className)}>
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-[10px] tracking-[0.32em] uppercase text-[var(--v2-text-secondary)] mb-8">
          Built for creators, backed by AI
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-5">
          {MEDIA_OUTLETS.map((name) => (
            <span
              key={name}
              className="font-display text-sm sm:text-base tracking-wide text-[var(--v2-text-secondary)]/50 grayscale select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
