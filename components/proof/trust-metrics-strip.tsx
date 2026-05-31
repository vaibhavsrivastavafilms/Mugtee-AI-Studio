'use client'

import { motion } from 'framer-motion'
import { Clock, FileText, FolderOpen, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROOF_TRUST_METRICS } from '@/lib/proof/showcase-examples'

/** Illustrative metrics — no public /api/stats endpoint; swap when live aggregates ship. */
const METRICS = [
  {
    key: 'scriptsGenerated',
    label: 'Scripts Generated',
    value: PROOF_TRUST_METRICS.scriptsGenerated,
    icon: FileText,
  },
  {
    key: 'projectsCreated',
    label: 'Projects Created',
    value: PROOF_TRUST_METRICS.projectsCreated,
    icon: FolderOpen,
  },
  {
    key: 'avgGenerationTime',
    label: 'Avg Generation Time',
    value: PROOF_TRUST_METRICS.avgGenerationTime,
    icon: Clock,
  },
  {
    key: 'creatorSuccessStories',
    label: 'Creator Success Stories',
    value: PROOF_TRUST_METRICS.creatorSuccessStories,
    icon: Users,
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

const HOMEPAGE_METRICS = METRICS.filter(
  (m) =>
    m.key === 'projectsCreated' ||
    m.key === 'scriptsGenerated' ||
    m.key === 'avgGenerationTime'
).map((m) =>
  m.key === 'projectsCreated'
    ? { ...m, label: 'Projects Generated' }
    : m.key === 'scriptsGenerated'
      ? { ...m, label: 'Scripts Created' }
      : { ...m, label: 'Average Generation Time' }
)

export function TrustMetricsStrip({
  className,
  variant = 'full',
}: {
  className?: string
  /** `homepage` shows three conversion-focused metrics only. */
  variant?: 'full' | 'homepage'
}) {
  const displayMetrics = variant === 'homepage' ? HOMEPAGE_METRICS : METRICS

  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 py-10 sm:py-12 bg-[var(--v2-surface,rgba(255,255,255,0.02))]',
        className
      )}
      aria-label="Platform trust metrics"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          {...fadeUp}
          className={cn(
            'grid gap-3 sm:gap-4',
            variant === 'homepage' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'
          )}
        >
          {displayMetrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <motion.div
                key={metric.key}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                className={cn(
                  'rounded-xl border border-[var(--v2-border,rgba(255,255,255,0.08))]',
                  'bg-[var(--v2-bg,#0a0a0a)]/60 px-4 py-4 sm:py-5 text-center'
                )}
              >
                <Icon
                  className="w-4 h-4 mx-auto mb-2 text-[var(--v2-gold,#d4af37)]/70"
                  aria-hidden
                />
                <p className="font-display text-xl sm:text-2xl text-[var(--v2-text-primary,#F4E7C1)] tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-1 text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-[var(--v2-text-secondary,rgba(244,231,193,0.5))]">
                  {metric.label}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
        <p className="mt-4 text-center text-[10px] text-[var(--v2-text-secondary,rgba(244,231,193,0.35))] tracking-wide">
          Illustrative platform metrics — representative of creator activity on Mugtee.
        </p>
      </div>
    </section>
  )
}
