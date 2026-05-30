'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Sparkles, Users, Zap } from 'lucide-react'
import type { PlanCatalogEntry } from '@/lib/billing/plan-catalog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/posthog'
import {
  RevenueEventTypes,
  trackRevenueValidation,
} from '@/lib/analytics/revenue-validation.client'
import { UpgradeWaitlistModal } from '@/components/billing/upgrade-waitlist-modal'

const ICONS = {
  free: Sparkles,
  creator: Crown,
  pro: Users,
} as const

type Props = {
  plans: PlanCatalogEntry[]
}

export function PricingPlans({ plans }: Props) {
  const [waitlistPlan, setWaitlistPlan] = useState<PlanCatalogEntry | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    track('pricing_page_view', { source: 'direct' })
    trackRevenueValidation({
      eventType: RevenueEventTypes.PRICING_PAGE_VISITS,
      source: 'pricing_page',
    })
  }, [])

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : ''
    if (!hash) return
    const match = plans.find((p) => p.id === hash)
    if (match?.waitlist) {
      setWaitlistPlan(match)
      setModalOpen(true)
    }
  }, [plans])

  const openWaitlist = useCallback((plan: PlanCatalogEntry) => {
    track('upgrade_click', { plan: plan.id, source: 'pricing_card' })
    trackRevenueValidation({
      eventType: RevenueEventTypes.UPGRADE_CLICKS,
      planInterest: plan.id,
      source: 'pricing_card',
    })
    setWaitlistPlan(plan)
    setModalOpen(true)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${plan.id}`)
    }
  }, [])

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14 sm:mt-16 items-stretch">
        {plans.map((plan, idx) => {
          const Icon = ICONS[plan.id]
          return (
            <motion.div
              key={plan.id}
              id={plan.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.08, duration: 0.55 }}
              whileHover={{ y: -4 }}
              className={cn(
                'relative rounded-2xl p-6 sm:p-7 flex flex-col transition-shadow duration-150 scroll-mt-24',
                plan.featured
                  ? 'border-2 border-[var(--v2-gold)]/50 bg-[var(--v2-surface)] shadow-[0_0_48px_-12px_rgba(212,175,55,0.35)]'
                  : 'border border-[var(--v2-border)] bg-[var(--v2-surface)] hover:border-[var(--v2-gold)]/25'
              )}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] tracking-[0.25em] uppercase rounded-full bg-[var(--v2-gold)] text-black font-semibold">
                  Recommended
                </span>
              ) : null}

              <div
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center mb-4',
                  plan.featured ? 'bg-gold-gradient text-black shadow-gold-glow' : 'glass-gold text-gold-300'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              <h3 className="font-display text-2xl">{plan.name}</h3>
              <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-1">
                {plan.badge}
              </div>

              <div className="flex items-baseline gap-1.5 mt-5">
                <span className="font-display text-3xl sm:text-4xl text-gold-gradient leading-none">
                  {plan.priceLabel}
                </span>
                <span className="text-xs text-muted-foreground tracking-wider">{plan.priceNote}</span>
              </div>

              <ul className="space-y-2 mt-6 mb-7 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-luxe/90">
                    <Check
                      className={cn(
                        'w-4 h-4 mt-0.5 shrink-0',
                        plan.featured ? 'text-gold-300' : 'text-emerald-300'
                      )}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.waitlist ? (
                <Button
                  onClick={() => openWaitlist(plan)}
                  className={cn(
                    'w-full h-11 gap-2',
                    plan.featured
                      ? 'bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-gold-500/30 hover:border-gold-500/60'
                  )}
                >
                  <Zap className="w-4 h-4" /> {plan.cta}
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full h-11 bg-white/[0.03] text-luxe/50 border border-white/[0.06] cursor-default"
                >
                  {plan.cta}
                </Button>
              )}
            </motion.div>
          )
        })}
      </div>

      <UpgradeWaitlistModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        plan={waitlistPlan}
      />
    </>
  )
}
