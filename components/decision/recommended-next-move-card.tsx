'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronDown, Sparkles, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { quickCutStudioHref } from '@/lib/create/routes'
import {
  activeDecision,
  useCreatorDecisionStore,
} from '@/stores/creator-decision-store'
import type { CreatorDecision } from '@/lib/decision/types'

export function RecommendedNextMoveCard({
  className,
  compact,
}: {
  className?: string
  compact?: boolean
}) {
  const decision = useCreatorDecisionStore((s) => s.decision)
  const loading = useCreatorDecisionStore((s) => s.loading)
  const hydrated = useCreatorDecisionStore((s) => s.hydrated)
  const altIndex = useCreatorDecisionStore((s) => s.altIndex)
  const fetchRecommended = useCreatorDecisionStore((s) => s.fetchRecommended)
  const acceptDecision = useCreatorDecisionStore((s) => s.acceptDecision)
  const cycleAlternative = useCreatorDecisionStore((s) => s.cycleAlternative)

  const [expanded, setExpanded] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!hydrated && !loading) void fetchRecommended()
  }, [hydrated, loading, fetchRecommended])

  const active = activeDecision(decision, expanded ? altIndex : 0)

  if (loading && !active) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-gold-500/15 bg-gold-500/[0.03] p-5 animate-pulse',
          className
        )}
      >
        <div className="h-4 w-40 bg-white/[0.04] rounded mb-3" />
        <div className="h-6 w-3/4 bg-white/[0.04] rounded mb-2" />
        <div className="h-3 w-full bg-white/[0.03] rounded" />
      </div>
    )
  }

  if (!active) return null

  const handleStart = async (d: CreatorDecision) => {
    setAccepting(true)
    try {
      const href = await acceptDecision(d)
      if (href && typeof window !== 'undefined') {
        window.location.href = href
        return
      }
    } finally {
      setAccepting(false)
    }
  }

  const ctaHref = quickCutStudioHref({
    topic: active.recommendedProject.topic.slice(0, 120),
  })

  const hasAlts = (decision?.alternatives?.length ?? 0) > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border border-gold-500/20 bg-gradient-to-br from-gold-500/[0.07] to-transparent p-5 sm:p-6',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-[var(--v2-gold)]" />
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">
          Recommended Next Move
        </p>
        {expanded && altIndex > 0 ? (
          <span className="text-[9px] text-luxe/40 ml-auto">Alternative {altIndex}</span>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${active.recommendedProject.topic}-${altIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h2
            className={cn(
              'font-display text-[var(--v2-text-primary)] mb-2',
              compact ? 'text-lg' : 'text-xl sm:text-2xl'
            )}
          >
            {active.recommendedProject.title}
          </h2>

          {!compact ? (
            <p className="text-xs text-luxe/50 mb-1">
              Topic: <span className="text-luxe/70">{active.recommendedProject.topic}</span>
            </p>
          ) : null}

          <p className="text-sm text-luxe/65 leading-relaxed max-w-2xl mb-3">
            <span className="text-gold-300/70 text-[10px] uppercase tracking-wider block mb-1">
              Why this matters
            </span>
            {active.whyThisMatters}
          </p>

          <div className="flex flex-wrap gap-3 text-[10px] tracking-wide mb-4">
            <span className="rounded-lg border border-gold-500/25 bg-gold-500/10 px-2.5 py-1 text-gold-200">
              Confidence {active.confidenceScore}%
            </span>
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-luxe/60">
              Opportunity {active.opportunityScore}%
            </span>
          </div>

          <p className="text-xs text-luxe/55 italic mb-4">
            <span className="not-italic text-[10px] uppercase tracking-wider text-luxe/40 block mb-0.5">
              Expected outcome
            </span>
            {active.expectedImpact}
          </p>

          {!compact && active.reasoningSummary ? (
            <p className="text-[10px] text-luxe/40 leading-relaxed mb-4">{active.reasoningSummary}</p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={accepting}
          onClick={() => void handleStart(active)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-4 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-black shadow-gold-glow hover:opacity-90 transition disabled:opacity-60"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Start This Project
          <ArrowRight className="w-3 h-3" />
        </button>

        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] px-4 py-2 text-[11px] tracking-[0.1em] uppercase text-luxe/60 hover:text-luxe/80 transition"
        >
          Quick link
        </Link>

        {hasAlts ? (
          <button
            type="button"
            onClick={() => {
              if (!expanded) {
                setExpanded(true)
                return
              }
              cycleAlternative()
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-gold-500/25 bg-gold-500/5 px-3 py-2 text-[10px] tracking-[0.14em] uppercase text-gold-200/90 hover:bg-gold-500/10"
          >
            {expanded ? 'Next alternative' : 'Show alternatives'}
            <ChevronDown
              className={cn('w-3 h-3 transition', expanded && 'rotate-180')}
            />
          </button>
        ) : null}
      </div>
    </motion.div>
  )
}
