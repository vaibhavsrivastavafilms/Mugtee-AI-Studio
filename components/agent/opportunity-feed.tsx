'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Radar, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createEntryHref } from '@/lib/create/routes'
import { useCreatorAgentStore } from '@/stores/creator-agent-store'

const TYPE_COLORS: Record<string, string> = {
  high_opportunity: 'border-gold-500/30 bg-gold-500/[0.06]',
  emerging_trend: 'border-amber-500/25 bg-amber-500/[0.05]',
  underserved_niche: 'border-emerald-500/20 bg-emerald-500/[0.04]',
  low_competition: 'border-sky-500/20 bg-sky-500/[0.04]',
}

export function OpportunityFeed({ className }: { className?: string }) {
  const feedSections = useCreatorAgentStore((s) => s.feedSections)
  const loading = useCreatorAgentStore((s) => s.loading)
  const fetchOpportunities = useCreatorAgentStore((s) => s.fetchOpportunities)

  useEffect(() => {
    void fetchOpportunities()
  }, [fetchOpportunities])

  if (loading && !feedSections.length) {
    return (
      <div className={cn('rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6', className)}>
        <p className="text-xs text-luxe/40 italic">Scanning opportunities…</p>
      </div>
    )
  }

  if (!feedSections.length) return null

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--v2-gold)] flex items-center gap-1.5">
            <Radar className="w-3.5 h-3.5" />
            Opportunity Radar
          </p>
          <h2 className="font-display text-lg text-[var(--v2-text-primary)] mt-1">
            What to create today
          </h2>
        </div>
        <Link
          href="/studio/growth"
          className="text-[10px] tracking-[0.16em] uppercase text-gold-300/70 hover:text-gold-200"
        >
          Growth center
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {feedSections.map((section) => (
          <div key={section.type} className="space-y-2">
            <p className="text-[10px] tracking-[0.2em] uppercase text-luxe/45">{section.label}</p>
            {section.items.slice(0, 2).map((item, i) => (
              <motion.div
                key={`${section.type}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'rounded-xl border p-3.5',
                  TYPE_COLORS[section.type] ?? 'border-white/[0.06] bg-white/[0.02]'
                )}
              >
                <p className="text-sm font-medium text-luxe/90">{item.title}</p>
                {item.why ? (
                  <p className="text-[11px] text-luxe/50 mt-1 leading-snug">{item.why}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/30 text-gold-300/80">
                    Opp {item.opportunityScore}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-black/30 text-luxe/50">
                    Viral {item.viralPotential}
                  </span>
                </div>
                <Link
                  href={createEntryHref('quick')}
                  className="inline-flex items-center gap-1 mt-2.5 text-[10px] text-gold-300/70 hover:text-gold-200"
                >
                  <Sparkles className="w-3 h-3" />
                  Create this
                </Link>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
