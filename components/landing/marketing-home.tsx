'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Play, Sparkles } from 'lucide-react'
import CinematicShowcase from '@/components/landing/cinematic-showcase'
import HeroGoogleCta from '@/components/landing/hero-google-cta'
import { MobileStickyCta } from '@/components/landing/mobile-sticky-cta'
import { HERO, PRICING, FINAL_CTA, FOOTER, PROOF } from '@/lib/marketing/site-copy'
import { quickCutStudioHref } from '@/lib/create/routes'
import { FeatureStatusBadge, type FeatureStatus } from '@/components/marketing/feature-status-badge'

const PROOF_STATUS: FeatureStatus[] = ['live', 'live', 'beta']

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

export default function MarketingHome() {
  const studioHref = quickCutStudioHref()

  return (
    <div className="relative min-h-screen bg-background text-luxe overflow-x-hidden pb-24 sm:pb-0 film-grain">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-gold-500/[0.07] blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-gold-400/[0.04] blur-[140px]" />
      </div>

      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#050505]/70 border-b border-white/[0.04]">
        <div className="container max-w-6xl mx-auto px-5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center shadow-gold-glow">
              <span className="font-display text-sm text-black font-black">M</span>
            </div>
            <span className="font-display text-base text-gold-gradient">Mugtee</span>
          </Link>
          <div className="hidden sm:flex items-center gap-7 text-[12px] tracking-wider uppercase text-luxe/70">
            <a href="#demo" className="hover:text-gold-300 transition">Demo</a>
            <a href="#features" className="hover:text-gold-300 transition">Features</a>
            <a href="#pricing" className="hover:text-gold-300 transition">Pricing</a>
            <a href="#cta" className="hover:text-gold-300 transition">Start</a>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/auth/login?next=${encodeURIComponent(studioHref)}`}
              className="hidden sm:inline-flex text-[12px] tracking-wider uppercase text-luxe/80 hover:text-gold-300 transition px-2 py-2"
            >
              Sign in
            </Link>
            <Link
              href={studioHref}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gold-gradient text-black text-[12px] font-medium shadow-gold-glow hover:opacity-90 transition-opacity"
            >
              {HERO.primaryCta} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative px-5 sm:px-6 pt-14 sm:pt-24 pb-16 sm:pb-24">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-gold-500/30 text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-7">
              <Sparkles className="w-3 h-3" /> {HERO.badge}
            </span>
            <h1 className="font-display text-[clamp(2.25rem,5.8vw,4.25rem)] leading-[1.06] tracking-tight">
              {HERO.headline}{' '}
              <span className="text-gold-gradient block sm:inline mt-1 sm:mt-0">{HERO.headlineAccent}</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-luxe/70 leading-relaxed max-w-2xl mx-auto">
              {HERO.subheadline}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <HeroGoogleCta next={studioHref} source="home_hero" helper={HERO.trust} />
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white/[0.035] border border-white/[0.08] text-[12.5px] text-luxe/85 hover:border-gold-500/40 transition"
              >
                <Play className="w-3.5 h-3.5 text-gold-300" /> {HERO.secondaryCta}
              </a>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {HERO.signals.map((signal) => (
                <span
                  key={signal}
                  className="px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-luxe/50"
                >
                  {signal}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div id="demo">
        <CinematicShowcase />
      </div>

      <section id="features" className="relative px-5 sm:px-6 py-20 sm:py-24 border-t border-white/[0.04]">
        <div className="container max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">{PROOF.eyebrow}</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">
              {PROOF.headline.split(' ').slice(0, 3).join(' ')}{' '}
              <span className="text-gold-gradient">{PROOF.headline.split(' ').slice(3).join(' ')}</span>.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-luxe/65">{PROOF.subheadline}</p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-4">
            {PROOF.steps.map((step, i) => (
              <motion.div
                key={step.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                className="rounded-2xl glass-strong border border-gold-soft p-5 sm:p-6"
              >
                <div className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80 mb-3 flex items-center justify-between gap-2">
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <FeatureStatusBadge status={PROOF_STATUS[i] ?? 'live'} />
                </div>
                <h3 className="font-display text-lg text-luxe mb-2">{step.title}</h3>
                <p className="text-[13.5px] text-luxe/60 leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative px-5 sm:px-6 py-20 sm:py-28 border-t border-white/[0.04]">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">{PRICING.eyebrow}</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">
              Calm access to the <span className="text-gold-gradient">studio</span>.
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {PRICING.tiers.map((tier) => (
              <motion.div
                key={tier.name}
                {...fadeUp}
                className={
                  'rounded-3xl p-6 flex flex-col ' +
                  (tier.highlight
                    ? 'glass-strong border-2 border-gold-500/60 shadow-gold-glow-lg'
                    : 'bg-white/[0.025] border border-white/[0.06]')
                }
              >
                <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-2">{tier.name}</div>
                <div className="font-display text-4xl mb-1">
                  {tier.price}
                  <span className="text-base text-muted-foreground font-sans">{tier.unit}</span>
                </div>
                <div className="text-[12px] text-luxe/65 mb-5">{tier.tagline}</div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[13px] text-luxe/85">
                      <Check className="w-3.5 h-3.5 text-gold-300 mt-[3px] shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>
                {'ctaHref' in tier && tier.ctaHref ? (
                  <a
                    href={tier.ctaHref}
                    className="block text-center py-3 rounded-lg text-sm font-medium bg-white/[0.04] border border-white/[0.08] hover:border-gold-500/40 transition"
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <Link
                    href={`/auth/login?next=${encodeURIComponent(studioHref)}`}
                    className={
                      'block text-center py-3 rounded-lg text-sm font-medium transition ' +
                      (tier.highlight
                        ? 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90'
                        : 'bg-white/[0.04] border border-white/[0.08] hover:border-gold-500/40')
                    }
                  >
                    {tier.cta}
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="relative px-5 sm:px-6 py-20 sm:py-28">
        <div className="container max-w-4xl mx-auto">
          <motion.div
            {...fadeUp}
            className="rounded-3xl overflow-hidden glass-strong border border-gold-500/40 p-10 sm:p-16 text-center"
          >
            <Sparkles className="w-6 h-6 text-gold-300 mx-auto mb-5" />
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">{FINAL_CTA.headline}</h2>
            <p className="mt-5 text-luxe/70 max-w-lg mx-auto text-sm sm:text-base">{FINAL_CTA.subheadline}</p>
            <Link
              href={studioHref}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-gold-gradient text-black text-sm font-medium shadow-gold-glow hover:opacity-90 transition-opacity"
            >
              {FINAL_CTA.cta} <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-10 px-5 sm:px-6">
        <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] tracking-wider uppercase text-muted-foreground/80">
          <span>© {new Date().getFullYear()} Mugtee · {FOOTER.tagline}</span>
          <div className="flex items-center gap-5">
            <Link href="/pricing" className="hover:text-gold-300 transition">Pricing</Link>
            <Link href="/privacy" className="hover:text-gold-300 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-gold-300 transition">Terms</Link>
          </div>
        </div>
      </footer>

      <MobileStickyCta />
    </div>
  )
}
