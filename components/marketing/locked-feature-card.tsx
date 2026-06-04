'use client'

import { Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type LockedFeatureCardProps = {
  title: string
  description: string
  eyebrow?: string
  waitlistHref?: string
  waitlistLabel?: string
  className?: string
}

/** Locked capability — never an empty page; always explains + optional waitlist CTA. */
export function LockedFeatureCard({
  title,
  description,
  eyebrow = 'Studio feature',
  waitlistHref = '/pricing',
  waitlistLabel = 'Join waitlist',
  className,
}: LockedFeatureCardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/[0.08]">
          <Lock className="h-5 w-5 text-gold-300/80" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-luxe/45">{eyebrow}</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-luxe/50">
              Locked
            </span>
          </div>
          <h3 className="font-display text-lg text-luxe/85">{title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-luxe/45">{description}</p>
          {waitlistHref ? (
            <Link
              href={waitlistHref}
              className="mt-3 inline-flex min-h-[40px] items-center rounded-xl border border-gold-500/35 bg-gold-500/[0.08] px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-200 transition-colors hover:bg-gold-500/12"
            >
              {waitlistLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
