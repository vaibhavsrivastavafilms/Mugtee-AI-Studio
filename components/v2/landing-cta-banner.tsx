'use client'

import { ArrowRight } from 'lucide-react'
import { LuxButton } from '@/components/v2/lux-button'
import { cn } from '@/lib/utils'

export function LandingCtaBanner({ className }: { className?: string }) {
  return (
    <section className={cn('px-5 sm:px-6 py-16 sm:py-20', className)}>
      <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] px-8 sm:px-14 py-12 sm:py-16 text-center">
        <h2 className="font-display text-3xl sm:text-[2.25rem] leading-tight text-[var(--v2-text-primary)]">
          Create 30 days of content{' '}
          <span className="italic text-[var(--v2-gold)]">in one hour</span>
        </h2>
        <LuxButton href="/create?mode=quick" size="lg" className="mt-8 rounded-full">
          Launch Mugtee <ArrowRight className="h-4 w-4" />
        </LuxButton>
        <p className="mt-4 text-[11px] tracking-[0.18em] uppercase text-[var(--v2-text-secondary)]">
          No credit card required
        </p>
      </div>
    </section>
  )
}
