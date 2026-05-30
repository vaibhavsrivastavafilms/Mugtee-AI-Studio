'use client'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Check, ArrowRight, Crown, Users, Building2, Lightbulb, FileText, Camera, Scissors, CalendarCheck, Send, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RazorpayCheckoutButton } from '@/components/billing/razorpay-checkout-button'
import { BookDemoButton } from '@/components/billing/book-demo-button'
import { PricingFaq } from '@/components/billing/pricing-faq'
import { LuxNav } from '@/components/v2/lux-nav'
import { LuxFooter } from '@/components/v2/lux-footer'
import { track } from '@/lib/posthog'

const WORKFLOW = [
  { icon: Lightbulb,      label: 'Imagine' },
  { icon: FileText,       label: 'Direct' },
  { icon: Camera,         label: 'Sequence' },
  { icon: Scissors,       label: 'Author' },
  { icon: CalendarCheck,  label: 'Preserve' },
  { icon: Send,           label: 'Present' },
  { icon: BarChart3,      label: 'Evolve' },
]

const PLANS = [
  {
    key: 'creator',
    name: 'Starter',
    badge: 'For solo storytellers',
    icon: Crown,
    price: 245,
    cycle: '/month',
    cta: 'Enter the studio',
    href: '/login',
    featured: false,
    features: [
      '1 storytelling workspace',
      'Cinematic script direction',
      'Storyboard immersion',
      'Presentation continuity',
      'Authored example worlds',
      '2 devices max',
    ],
  },
  {
    key: 'agency',
    name: 'Pro',
    badge: 'For small studios',
    icon: Users,
    price: 999,
    cycle: '/month',
    cta: 'Launch studio',
    href: '/login',
    featured: true,
    features: [
      'Up to 5 members',
      'Shared storytelling continuity',
      'Collaborative world workspaces',
      'Advanced presentation layers',
      'Higher direction capacity',
      '5 devices max',
    ],
  },
  {
    key: 'enterprise',
    name: 'Studio',
    badge: 'For larger production houses',
    icon: Building2,
    price: null,
    cycle: 'Custom',
    cta: 'Contact Support',
    href: 'mailto:support@tabletales.studio?subject=Enterprise%20Plan%20Enquiry',
    featured: false,
    features: [
      'Unlimited members',
      'Unlimited devices',
      'Priority support',
      'Dedicated onboarding',
      'Custom integrations',
      'SLA + uptime guarantee',
    ],
    blurb: 'Need more than 5 members or devices?',
  },
]

export default function PricingPage() {
  // V4.0 — Track pricing_opened on mount for funnel analytics.
  useEffect(() => { track('pricing_opened', { source: 'direct' }) }, [])
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--v2-bg)] text-[var(--v2-text-primary)] v2-page-enter">
      <LuxNav />

      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.3}}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--v2-border)] bg-[var(--v2-surface)] mb-5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--v2-gold)]" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-[var(--v2-text-secondary)]">Studio access</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl leading-[1.1] tracking-tight">
            <span className="text-[var(--v2-gold)]">Calm access</span>
            <span className="block text-[var(--v2-text-primary)] mt-1">to the cinematic studio.</span>
          </h1>
          <p className="text-[var(--v2-text-secondary)] mt-4 text-sm sm:text-base leading-relaxed">
            The cinematic storytelling operating system — imagine, direct, preserve, present, and evolve emotionally immersive worlds.
          </p>

          {/* Workflow strip */}
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.25, duration:0.5}}
            className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 mt-7"
          >
            {WORKFLOW.map((w, i) => (
              <div key={w.label} className="contents">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md glass text-[11px] tracking-wide text-luxe">
                  <w.icon className="w-3 h-3 text-gold-400" /> {w.label}
                </div>
                {i < WORKFLOW.length - 1 && <span className="text-gold-400/40 text-xs">→</span>}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14 sm:mt-16 items-stretch">
          {PLANS.map((p, idx) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.key}
                initial={{opacity:0, y:18}} animate={{opacity:1, y:0}} transition={{delay: 0.1 + idx*0.08, duration:0.55}}
                whileHover={{y:-4}}
                className={cn(
                  'relative rounded-2xl p-6 sm:p-7 flex flex-col transition-shadow duration-150',
                  p.featured
                    ? 'border-2 border-[var(--v2-gold)]/50 bg-[var(--v2-surface)] shadow-[0_0_48px_-12px_rgba(212,175,55,0.35)]'
                    : 'border border-[var(--v2-border)] bg-[var(--v2-surface)] hover:border-[var(--v2-gold)]/25',
                )}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] tracking-[0.25em] uppercase rounded-full bg-[var(--v2-gold)] text-black font-semibold">
                    Recommended
                  </span>
                )}
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4',
                  p.featured ? 'bg-gold-gradient text-black shadow-gold-glow' : 'glass-gold text-gold-300')}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-2xl">{p.name}</h3>
                <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-1">{p.badge}</div>
                {p.blurb && (
                  <p className="text-sm text-luxe/80 mt-4 leading-snug">{p.blurb}</p>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mt-5">
                  {p.price !== null ? (
                    <>
                      <span className="font-display text-4xl sm:text-5xl text-gold-gradient leading-none">₹{p.price}</span>
                      <span className="text-xs text-muted-foreground tracking-wider">{p.cycle}</span>
                    </>
                  ) : (
                    <span className="font-display text-3xl sm:text-4xl text-gold-gradient leading-none">{p.cycle}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mt-6 mb-7 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-luxe/90">
                      <Check className={cn('w-4 h-4 mt-0.5 shrink-0', p.featured ? 'text-gold-300' : 'text-emerald-300')} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* V3.7 — Single CTA per pricing card.
                    V3.9 — Agency plan now routes to a real conversation (Book Demo \u2192
                    WhatsApp / email) instead of Razorpay. Custom-onboarding + custom pricing
                    converts massively better than auto-subscribe for team plans. */}
                {p.key === 'agency' ? (
                  <BookDemoButton
                    variant={p.featured ? 'gold' : 'soft'}
                    label={`Book Demo \u00B7 \u20B9${p.price}/mo`}
                  />
                ) : p.key === 'creator' ? (
                  <RazorpayCheckoutButton
                    plan="creator"
                    variant={p.featured ? 'gold' : 'soft'}
                    label={`Subscribe \u00B7 \u20B9${p.price}/mo`}
                  />
                ) : (
                  <Link href={p.href} className="block">
                    <Button className={cn(
                      'w-full h-11 gap-2',
                      p.featured
                        ? 'bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-gold-500/30 hover:border-gold-500/60',
                    )}>
                      {p.cta} <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* V3.9 — Compact FAQ accordion. Pure CSS, zero JS state, mobile-first. */}
        <PricingFaq />

        {/* Footnote */}
        <div className="text-center mt-12 text-[11px] tracking-widest uppercase text-[var(--v2-text-secondary)]">
          All plans billed monthly · Cancel anytime · Built in Ahmedabad
        </div>
      </div>
      <LuxFooter />
    </div>
  )
}
