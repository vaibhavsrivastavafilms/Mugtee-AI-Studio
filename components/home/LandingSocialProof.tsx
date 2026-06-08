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
    <section className={cn('px-4 py-12 sm:px-6 sm:py-14 text-center', className)}>
      <div className="mx-auto max-w-2xl">
        <h2 className="font-display text-xl sm:text-2xl text-white">Built for Creators</h2>
        <p className="mt-3 text-sm text-white/50 leading-relaxed">
          Generate cinematic content faster than traditional workflows.
        </p>

        {showMetrics ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <li
                key={metric.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5"
              >
                <p className="font-display text-2xl text-[#D4AF37]">{metric.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
                  {metric.label}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
