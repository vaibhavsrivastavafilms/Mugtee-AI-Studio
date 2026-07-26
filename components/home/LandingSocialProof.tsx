'use client'

import {
  getLandingSocialProofMetrics,
  isLandingMetricsEnabled,
} from '@/lib/socialProof'
import { cn } from '@/lib/utils'

type LandingSocialProofProps = {
  className?: string
}

export function LandingSocialProof({ className }: LandingSocialProofProps) {
  const showMetrics = isLandingMetricsEnabled()
  const metrics = getLandingSocialProofMetrics()

  return (
    <section className={cn('py-14 text-center sm:py-20', className)}>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
          Creator stories
        </p>
        <h2 className="mt-4 font-display text-4xl leading-tight text-white sm:text-5xl">
          Built for the ideas that keep following you around.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[#B8B8B8]">
          Mugtee is designed for project memory, creative continuity, and the quiet confidence
          that your unfinished thoughts are still safe.
        </p>

        {showMetrics ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <li
                key={metric.id}
                className="rounded-[1.75rem] border border-[rgba(212,175,55,0.18)] bg-[#191919]/90 px-4 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.4)]"
              >
                <p className="font-display text-3xl text-[#D4AF37]">{metric.value}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#888888]">
                  {metric.label}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {['Your style remembered', 'Your worlds organized', 'Your next step clearer'].map(
              (item) => (
                <li
                  key={item}
                  className="rounded-[1.75rem] border border-[rgba(212,175,55,0.18)] bg-[#191919]/90 px-4 py-5 shadow-[0_14px_36px_rgba(0,0,0,0.4)]"
                >
                  <p className="font-display text-2xl text-white">{item}</p>
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
