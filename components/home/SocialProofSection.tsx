'use client'

import { getFeaturedCreators, getSocialProofHeadline, getSocialProofMetrics } from '@/lib/socialProof'
import { cn } from '@/lib/utils'

export function SocialProofSection({ className }: { className?: string }) {
  const metrics = getSocialProofMetrics()
  const creators = getFeaturedCreators()
  const headline = getSocialProofHeadline()

  return (
    <section
      id="social-proof"
      className={cn('border-t border-white/[0.06] bg-[#030303] px-4 py-14 sm:px-6', className)}
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-[10px] uppercase tracking-[0.32em] text-[#D4AF37]/65">
          Creator momentum
        </p>
        <h2 className="mt-2 text-center font-display text-2xl text-white">{headline}</h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <li
              key={metric.id}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-6 text-center"
            >
              <p className="font-display text-3xl text-[#D4AF37]">{metric.value}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
                {metric.label}
              </p>
              {metric.detail ? (
                <p className="mt-2 text-[10px] leading-relaxed text-white/40">{metric.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <h3 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-white/55">
            Featured creators
          </h3>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {creators.map((creator) => (
              <li
                key={creator.id}
                className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-4"
              >
                <p className="text-sm font-medium text-white/85">{creator.name}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#D4AF37]/70">
                  {creator.niche}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-white/45">{creator.highlight}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
