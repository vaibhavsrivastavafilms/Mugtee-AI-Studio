'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  EMPTY_STATE_STARTERS,
  proofStarterHref,
  proofNicheLabel,
  type ProofEmptyStarter,
} from '@/lib/proof/showcase-examples'

type EmptyStateExamplesProps = {
  className?: string
  /** Override starters — defaults to proof layer EMPTY_STATE_STARTERS. */
  starters?: ProofEmptyStarter[]
  /** `cards` — compact inline grid for library empty states. */
  variant?: 'default' | 'cards'
}

export function EmptyStateExamples({
  className,
  starters = EMPTY_STATE_STARTERS,
  variant = 'default',
}: EmptyStateExamplesProps) {
  if (variant === 'cards') {
    return (
      <section className={cn('space-y-3', className)} aria-label="Example projects">
        <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--v2-gold)] text-center">
          Need inspiration?
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {starters.map((starter) => (
            <li key={starter.id}>
              <Link
                href={proofStarterHref(starter)}
                className={cn(
                  'group flex items-center justify-between gap-2 rounded-xl',
                  'border border-[var(--v2-border)] bg-[var(--v2-surface)] px-3 py-2.5 min-h-[44px]',
                  'hover:border-[var(--v2-gold)]/35 transition-colors'
                )}
              >
                <span className="text-sm text-[var(--v2-text-primary)] truncate">{starter.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--v2-text-secondary)] group-hover:text-[var(--v2-gold)] shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-black/25 backdrop-blur-sm p-4 sm:p-5 space-y-4',
        className
      )}
      aria-label="Example projects"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-300">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base text-[#F4E7C1]">Need inspiration?</p>
          <p className="text-xs text-luxe/50 mt-0.5 leading-relaxed">
            Pick an example — we&apos;ll prefill your idea. You press generate when ready.
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {starters.map((starter) => (
          <li key={starter.id}>
            <Link
              href={proofStarterHref(starter)}
              className={cn(
                'group flex items-center justify-between gap-3 rounded-xl',
                'border border-white/[0.08] bg-black/35 px-3.5 py-3 min-h-[52px]',
                'hover:border-gold-500/30 hover:bg-gold-500/[0.05] transition-colors'
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F4E7C1]/90 truncate">{starter.label}</p>
                <Badge
                  variant="outline"
                  className="mt-1 border-gold-500/20 text-[9px] text-gold-200/70"
                >
                  {proofNicheLabel(starter.niche)}
                </Badge>
              </div>
              <ArrowRight className="h-4 w-4 text-luxe/30 group-hover:text-gold-300 transition shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
