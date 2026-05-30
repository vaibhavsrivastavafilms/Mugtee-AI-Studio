import { Sparkles } from 'lucide-react'
import { getPlanCatalog } from '@/lib/billing/plan-catalog'
import { PricingExitTracker } from '@/components/billing/pricing-exit-tracker'
import { PricingPlans } from '@/components/billing/pricing-plans'
import { PricingFaq } from '@/components/billing/pricing-faq'
import { LuxNav } from '@/components/v2/lux-nav'
import { LuxFooter } from '@/components/v2/lux-footer'

export default function PricingPage() {
  const plans = getPlanCatalog()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--v2-bg)] text-[var(--v2-text-primary)] v2-page-enter">
      <PricingExitTracker />
      <LuxNav />

      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center max-w-3xl mx-auto v2-page-enter">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--v2-border)] bg-[var(--v2-surface)] mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--v2-gold)]" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--v2-text-secondary)]">
              Plans & limits
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl leading-[1.1] tracking-tight">
            <span className="text-[var(--v2-gold)]">Choose your</span>
            <span className="block text-[var(--v2-text-primary)] mt-1">cinematic studio tier.</span>
          </h1>
          <p className="text-[var(--v2-text-secondary)] mt-4 text-sm sm:text-base leading-relaxed">
            Start free with generous limits. Join the waitlist for Creator and Pro — billing launches
            soon with no surprise charges today.
          </p>
        </div>

        <PricingPlans plans={plans} />

        <PricingFaq />

        <div className="text-center mt-12 text-[11px] tracking-widest uppercase text-[var(--v2-text-secondary)]">
          Paid plans coming soon · Join the waitlist · Built in Ahmedabad
        </div>
      </div>
      <LuxFooter />
    </div>
  )
}
