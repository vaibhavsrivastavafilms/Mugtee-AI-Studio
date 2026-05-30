'use client'

import { cn } from '@/lib/utils'

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'tiktok', label: 'TikTok' },
] as const

export function LandingTrustedBy({ className }: { className?: string }) {
  return (
    <section className={cn('px-5 sm:px-6 py-10 sm:py-12 border-y border-[var(--v2-border)]', className)}>
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-[10px] tracking-[0.32em] uppercase text-[var(--v2-text-secondary)] mb-8">
          Trusted by creators on
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 sm:gap-x-16 gap-y-4">
          {PLATFORMS.map((p) => (
            <span
              key={p.id}
              className={cn(
                'font-display text-xl sm:text-2xl tracking-wide',
                p.id === 'youtube' && 'text-[#FF0000]',
                p.id === 'instagram' && 'text-[#E4405F]',
                p.id === 'shorts' && 'text-[#FF0033]',
                p.id === 'tiktok' && 'text-[var(--v2-text-primary)]/90',
              )}
            >
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
