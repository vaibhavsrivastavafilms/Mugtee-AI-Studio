'use client'

import { memo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const PLANS = [
  {
    id: 'free',
    name: 'FREE',
    price: '$0',
    period: 'forever',
    description: 'Shape your first cinematic stories.',
    features: [
      '3 Quick Cut videos / month',
      'AI script + scene generation',
      'Vertical preview export',
      'Documentary voice style',
    ],
    cta: 'Start Free',
    href: '/login',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '$19',
    period: '/ month',
    description: 'For creators shipping weekly.',
    features: [
      'Unlimited cinematic videos',
      'Director\'s Cut workflow',
      'All voice styles + custom tone',
      'Priority MP4 export · 1080p',
      'Scene regeneration + storyboard',
    ],
    cta: 'Go Pro',
    href: '/login?plan=pro',
    highlighted: true,
  },
]

export const PricingCards = memo(function PricingCards() {
  return (
    <section id="pricing" className="relative px-5 sm:px-6 py-20 sm:py-24 border-t border-white/[0.04]">
      <div className="container max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">
            Pricing
          </div>
          <h2 className="font-display text-3xl sm:text-4xl text-luxe">
            Start free. <span className="text-gold-gradient">Scale cinematic.</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                'relative rounded-2xl p-6 sm:p-7 border flex flex-col',
                plan.highlighted
                  ? 'border-gold-500/40 bg-gradient-to-b from-gold-500/[0.08] to-black/40 shadow-gold-glow cinematic-success-glow'
                  : 'border-gold-soft glass'
              )}
            >
              {plan.highlighted ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gold-gradient text-[9px] tracking-[0.2em] uppercase text-black font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Popular
                </div>
              ) : null}

              <div className="mb-5">
                <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80 mb-1">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl text-luxe">{plan.price}</span>
                  <span className="text-sm text-luxe/50">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-luxe/60">{plan.description}</p>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-luxe/75">
                    <Check className="w-4 h-4 text-gold-400/80 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  'w-full min-h-[44px] rounded-xl text-[12px] tracking-[0.14em] uppercase',
                  plan.highlighted
                    ? 'bg-gold-gradient text-black font-semibold shadow-gold-glow hover:opacity-90'
                    : 'bg-white/[0.06] text-gold-200 border border-gold-500/30 hover:bg-gold-500/10'
                )}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
})
