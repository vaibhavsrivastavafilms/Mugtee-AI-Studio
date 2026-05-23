'use client'
// Phase — Cinematic landing page (client component, split for SSR-friendly motion).
// Sections: NAV · HERO · WORKFLOW · FEATURES · SOCIAL PROOF · PRICING · FINAL CTA · FOOTER
// All tokens reuse the existing design system. No new deps.

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Sparkles, Play, ArrowRight, Lightbulb, Wand2, Image as ImageIcon, Mic2, Film,
  Captions, Send, BarChart3, Volume2, Check, Crown, Zap, Brain, Loader2,
  Instagram, Youtube, Clock, TrendingUp, Twitter, Mail, FileText,
} from 'lucide-react'
import { GuestHookGenerator } from '@/components/landing/guest-hook-generator'
import { EmailCapture } from '@/components/landing/email-capture'
import ProofSections from '@/components/landing/proof-sections'
import CinematicShowcase from '@/components/landing/cinematic-showcase'

// Small fade-up helper — keeps animation system lightweight.
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as any },
}

export default function LandingClient() {
  return (
    <div className="relative min-h-screen bg-background text-luxe overflow-x-hidden">
      {/* Ambient cinematic glow — pure CSS, no JS animation */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-gold-500/[0.07] blur-[140px]" />
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-amber-500/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-gold-400/[0.04] blur-[140px]" />
      </div>

      {/* ─── NAV ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/[0.04]">
        <div className="container max-w-6xl mx-auto px-5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center shadow-gold-glow">
              <span className="font-display text-sm text-black font-black">M</span>
            </div>
            <span className="font-display text-base tracking-wide"><span className="text-gold-gradient">Mugtee</span></span>
          </Link>
          <div className="hidden sm:flex items-center gap-7 text-[12px] tracking-wider uppercase text-luxe/70">
            <a href="#workflow" className="hover:text-gold-300 transition">Workflow</a>
            <a href="#features" className="hover:text-gold-300 transition">Features</a>
            <a href="#pricing" className="hover:text-gold-300 transition">Pricing</a>
            <Link href="/blog" className="hover:text-gold-300 transition">Blog</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex text-[12px] tracking-wider uppercase text-luxe/80 hover:text-gold-300 transition px-2 py-2">Sign in</Link>
            <Link href="/login" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gold-gradient text-black text-[12px] font-medium shadow-gold-glow hover:opacity-90 transition">
              Start Free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-gold-500/30 text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-6">
              <Sparkles className="w-3 h-3" /> AI Content OS · v1.0
            </span>
            <h1 className="font-display text-[clamp(2.2rem,5.5vw,4.2rem)] leading-[1.05] tracking-tight">
              From <span className="text-gold-gradient">Idea to Viral Reel</span><br className="hidden sm:block" /> — Automatically.
            </h1>
            <p className="mt-5 sm:mt-6 text-base sm:text-lg text-luxe/70 leading-relaxed max-w-2xl mx-auto">
              Scripts, visuals, voiceovers, editing, captions and publishing — powered by AI. The operating system that turns one prompt into a week of content.
            </p>
            <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Phase 3F — Cinematic auth entry. The hero now routes to a
                  dedicated cinematic /login surface instead of firing OAuth
                  inline. Reuses the existing /login page + Google flow; no
                  auth architecture changes. Demo link is preserved. */}
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-xl bg-gold-gradient text-black text-sm sm:text-base font-medium shadow-gold-glow hover:opacity-90 transition"
              >
                <Sparkles className="w-4 h-4" /> Start Creating Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="#workflow" className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-lg bg-white/[0.035] border border-white/[0.08] text-[12.5px] text-luxe/85 hover:bg-white/[0.07] hover:border-gold-500/40 transition">
                <Play className="w-3.5 h-3.5 text-gold-300" /> Watch 60-sec Demo
              </a>
            </div>
            <div className="mt-5 text-[11px] tracking-widest uppercase text-muted-foreground/70">
              No credit card · Free credits to start
            </div>
          </motion.div>

          {/* Hero visual — faux dashboard preview */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-14 sm:mt-20 max-w-5xl mx-auto"
          >
            <DashboardMock />
            {/* Floating glass cards — subtle CSS float animation */}
            <FloatingCard className="hidden sm:flex absolute -left-6 lg:-left-16 top-1/4" icon={<Wand2 className="w-3.5 h-3.5 text-gold-300" />} label="AI Script Ready" value="1,247 words · cinematic" delay="0s" />
            <FloatingCard className="hidden sm:flex absolute -right-4 lg:-right-14 top-12" icon={<Film className="w-3.5 h-3.5 text-amber-300" />} label="Reel Rendering" value="00:24 · 1080×1920" delay="-1.4s" />
            <FloatingCard className="hidden sm:flex absolute -right-6 lg:-right-20 bottom-14" icon={<Instagram className="w-3.5 h-3.5 text-pink-300" />} label="Posting to Instagram" value="@mugteeaistudio" delay="-2.8s" />
            <FloatingCard className="hidden sm:flex absolute -left-3 lg:-left-12 bottom-8" icon={<Volume2 className="w-3.5 h-3.5 text-gold-300" />} label="Voice Generated" value="0:38 · narrator-warm" delay="-2.1s" />
          </motion.div>
        </div>
      </section>

      {/* ─── PROOF: How it works · Output preview · Made for · CTA ─ */}
      {/* V2C — Cinematic Showcase: emotional proof immediately after hero */}
      <CinematicShowcase />

      <ProofSections />

      {/* ─── WORKFLOW ────────────────────────────────────────────── */}
      <section id="workflow" className="relative px-5 sm:px-6 py-20 sm:py-28">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">The Mugtee workflow</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">One prompt. <span className="text-gold-gradient">Seven AI agents</span>. Zero editing software.</h2>            <p className="mt-4 text-sm sm:text-base text-luxe/65">From a single creative spark to a published reel — each step orchestrated, each transition seamless.</p>
          </motion.div>

          {/* Desktop horizontal timeline */}
          <div className="hidden lg:block relative">
            <div className="absolute top-[34px] left-[6%] right-[6%] h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
            <div className="grid grid-cols-7 gap-2 relative">
              {WORKFLOW_STEPS.map((s, i) => (
                <motion.div key={s.label} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }} className="text-center">
                  <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-background border border-gold-500/40 shadow-gold-glow flex items-center justify-center relative z-10">
                    <s.icon className="w-5 h-5 text-gold-300" />
                  </div>
                  <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1">Step {i + 1}</div>
                  <div className="text-[13px] font-medium text-luxe">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile vertical timeline */}
          <div className="lg:hidden relative pl-8">
            <div className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-gold-500/50 to-transparent" />
            <div className="space-y-5">
              {WORKFLOW_STEPS.map((s, i) => (
                <motion.div key={s.label} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.04 }} className="flex items-center gap-3 relative">
                  <div className="absolute -left-8 w-7 h-7 rounded-full bg-background border border-gold-500/40 shadow-gold-glow flex items-center justify-center">
                    <s.icon className="w-3.5 h-3.5 text-gold-300" />
                  </div>
                  <div>
                    <div className="text-[9px] tracking-widest uppercase text-muted-foreground/80">Step {i + 1}</div>
                    <div className="text-sm text-luxe">{s.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Phase V1.2 — Tasteful demo video placeholder card */}
          <motion.div {...fadeUp} className="mt-14 sm:mt-20 max-w-3xl mx-auto">
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden glass-strong border border-gold-soft aspect-video flex flex-col items-center justify-center text-center p-8">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gold-500/[0.06] via-transparent to-amber-500/[0.04]" />
              <div className="w-16 h-16 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-gold-glow mb-4">
                <Play className="w-7 h-7 text-black ml-1" />
              </div>
              <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300/90 mb-2">Coming Soon</div>
              <h3 className="font-display text-2xl sm:text-3xl leading-tight mb-2">Demo video <span className="text-gold-gradient">coming soon</span></h3>
              <p className="text-luxe/65 text-sm max-w-md mb-5">A 60-second walk-through of how a single idea becomes a published reel inside Mugtee.</p>
              <button disabled className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-luxe/60 text-xs tracking-wider uppercase cursor-not-allowed">
                <Play className="w-3.5 h-3.5 text-gold-300/70" /> Watch 60-sec Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Phase V1.2 — Try Mugtee (no-signup viral hook generator) */}
      <section className="relative px-5 sm:px-6 py-12 sm:py-16">
        <div className="container max-w-5xl mx-auto">
          <motion.div {...fadeUp}>
            <GuestHookGenerator />
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────── */}
      <section id="features" className="relative px-5 sm:px-6 py-20 sm:py-28">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">Every layer covered</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">A studio in <span className="text-gold-gradient">your browser</span>.</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: (i % 3) * 0.06, ease: 'easeOut' }}
                className="group relative rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] hover:border-gold-500/40 transition shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] hover:shadow-[0_0_28px_-8px_rgba(245,196,77,0.35)]"
              >
                {f.coming && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-[9px] tracking-[0.25em] uppercase text-amber-200">
                    Coming Soon
                  </span>
                )}
                <div className="w-10 h-10 rounded-lg bg-gold-500/[0.08] border border-gold-500/25 flex items-center justify-center mb-3 group-hover:border-gold-500/50 transition">
                  <f.icon className="w-4 h-4 text-gold-300" />
                </div>
                <div className="font-display text-lg leading-tight mb-1">{f.title}</div>
                <div className="text-[13px] text-luxe/65 leading-relaxed">{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-6 py-20 sm:py-28">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">Built for compounding output</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">The math is <span className="text-gold-gradient">unfair</span> on the old way.</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-10">
            {STATS.map((s) => (
              <motion.div key={s.label} {...fadeUp} className="rounded-2xl glass-strong border border-gold-soft p-6 sm:p-7 text-center">
                <div className="font-display text-4xl sm:text-5xl text-gold-gradient mb-1.5">{s.value}</div>
                <div className="text-[11px] tracking-widest uppercase text-luxe/70">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Phase V1.2 — Trust Fix #2: Removed fake-looking testimonials. Honest placeholder until real creator quotes are collected. */}
            <motion.div {...fadeUp} className="rounded-2xl p-6 sm:p-7 bg-white/[0.025] border border-white/[0.05] lg:col-span-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/25 text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-3">
                <Sparkles className="w-3 h-3" /> Coming soon
              </div>
              <h3 className="font-display text-xl sm:text-2xl leading-tight mb-2">Creator testimonials, <span className="text-gold-gradient">coming soon</span>.</h3>
              <p className="text-luxe/65 text-sm leading-relaxed max-w-xl mx-auto">
                We're inviting our first creators to share honest, on-the-record feedback. Want to be one of them? <a href="mailto:hello@mugtee.in" className="text-gold-300 hover:text-gold-200 transition underline-offset-4 hover:underline">Email us</a> — we'll get you on early access.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────────────── */}
      <section id="pricing" className="relative px-5 sm:px-6 py-20 sm:py-28">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">Pricing</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">Premium, <span className="text-gold-gradient">priced for creators</span>.</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {PRICING.map((p) => (
              <motion.div
                key={p.name}
                {...fadeUp}
                className={
                  'relative rounded-3xl p-6 sm:p-7 flex flex-col ' +
                  (p.highlight
                    ? 'glass-strong border-2 border-gold-500/60 shadow-[0_0_40px_-12px_rgba(245,196,77,0.5)]'
                    : 'bg-white/[0.025] border border-white/[0.06]')
                }
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold-gradient text-black text-[10px] font-bold tracking-widest uppercase shadow-gold-glow">
                    Most Popular
                  </div>
                )}
                <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-2">{p.name}</div>
                <div className="font-display text-4xl mb-1">
                  {p.price}<span className="text-base text-muted-foreground font-sans">{p.unit}</span>
                </div>
                <div className="text-[12px] text-luxe/65 mb-5">{p.tagline}</div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-luxe/85">
                      <Check className="w-3.5 h-3.5 text-gold-300 mt-[3px] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {/* Phase V1.2 — Trust Fix #6: Agency CTA bypasses login wall */}
                {p.ctaHref ? (
                  <a
                    href={p.ctaHref}
                    className={
                      'block text-center py-3 rounded-lg text-sm font-medium transition ' +
                      (p.highlight
                        ? 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90'
                        : 'bg-white/[0.04] border border-white/[0.08] text-luxe hover:bg-white/[0.08] hover:border-gold-500/40')
                    }
                  >
                    {p.cta}
                  </a>
                ) : (
                  <Link
                    href="/login"
                    className={
                      'block text-center py-3 rounded-lg text-sm font-medium transition ' +
                      (p.highlight
                        ? 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90'
                        : 'bg-white/[0.04] border border-white/[0.08] text-luxe hover:bg-white/[0.08] hover:border-gold-500/40')
                    }
                  >
                    {p.cta}
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Phase V1.2 — Lightweight email capture */}
      <section className="relative px-5 sm:px-6 py-8 sm:py-12">
        <div className="container max-w-4xl mx-auto">
          <motion.div {...fadeUp}>
            <EmailCapture />
          </motion.div>
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-6 py-20 sm:py-28">
        <div className="container max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="relative rounded-3xl overflow-hidden glass-strong border border-gold-500/40 p-10 sm:p-16 text-center">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gold-500/[0.08] via-transparent to-amber-500/[0.05]" />
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-gold-400/[0.15] blur-[120px] -z-10" />
            <Sparkles className="w-6 h-6 text-gold-300 mx-auto mb-5" />
            <h2 className="font-display text-3xl sm:text-5xl leading-[1.08]">
              Your <span className="text-gold-gradient">AI Content Team</span><br />starts here.
            </h2>
            <p className="mt-5 text-luxe/70 max-w-lg mx-auto text-sm sm:text-base">
              Join creators turning 30 days of work into one focused hour. Mugtee handles the rest.
            </p>
            <Link href="/login" className="mt-8 inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 rounded-lg bg-gold-gradient text-black text-sm font-medium shadow-gold-glow hover:opacity-90 transition">
              Launch Mugtee AI <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-12 px-5 sm:px-6">
        <div className="container max-w-6xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center shadow-gold-glow">
                <span className="font-display text-sm text-black font-black">M</span>
              </div>
              <span className="font-display text-base tracking-wide"><span className="text-gold-gradient">Mugtee</span></span>
            </Link>
            {/* Phase V1.2 — Trust Fix #9: social links */}
            <div className="flex items-center gap-2">
              <a href="https://instagram.com/mugteeaistudio" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-gold-500/40 hover:bg-gold-500/10 text-luxe/70 hover:text-gold-300 inline-flex items-center justify-center transition">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://youtube.com/@mugtee" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-gold-500/40 hover:bg-gold-500/10 text-luxe/70 hover:text-gold-300 inline-flex items-center justify-center transition">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="https://x.com/mugtee" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter" className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-gold-500/40 hover:bg-gold-500/10 text-luxe/70 hover:text-gold-300 inline-flex items-center justify-center transition">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="mailto:hello@mugtee.in" aria-label="Email" className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-gold-500/40 hover:bg-gold-500/10 text-luxe/70 hover:text-gold-300 inline-flex items-center justify-center transition">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-white/[0.04] text-[11px] tracking-wider uppercase text-muted-foreground/80">
            <span>© {new Date().getFullYear()} Mugtee · An AI Production OS for creators</span>
            <div className="flex items-center gap-5 flex-wrap justify-center">
              <Link href="/blog" className="hover:text-gold-300 transition">Blog</Link>
              <Link href="/pricing" className="hover:text-gold-300 transition">Pricing</Link>
              <Link href="/privacy" className="hover:text-gold-300 transition">Privacy</Link>
              <Link href="/terms" className="hover:text-gold-300 transition">Terms</Link>
              <Link href="/about" className="hover:text-gold-300 transition">About</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Local CSS — pure CSS float (no JS, no animation library cost) */}
      <style>{`
        @keyframes float-y { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        .float { animation: float-y 6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────

function FloatingCard({ icon, label, value, delay, className = '' }: { icon: React.ReactNode; label: string; value: string; delay: string; className?: string }) {
  return (
    <div
      className={`float items-center gap-2.5 rounded-xl glass-strong border border-gold-500/30 shadow-cinema px-3.5 py-2.5 ${className}`}
      style={{ animationDelay: delay }}
    >
      <div className="w-7 h-7 rounded-md bg-gold-500/15 border border-gold-500/30 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[9.5px] tracking-[0.18em] uppercase text-gold-300/90 leading-none mb-0.5">{label}</div>
        <div className="text-[11px] text-luxe truncate">{value}</div>
      </div>
    </div>
  )
}

function DashboardMock() {
  return (
    <div className="rounded-2xl sm:rounded-3xl overflow-hidden glass-strong border border-gold-soft shadow-cinema">
      {/* macOS-style window chrome */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.04] bg-black/30">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
        </div>
        <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">mugtee.in · studio</div>
        <div className="w-12" />
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-12 gap-3 sm:gap-4 bg-gradient-to-b from-background to-black/40 min-h-[260px] sm:min-h-[420px]">
        {/* Sidebar */}
        <div className="hidden sm:flex col-span-2 flex-col gap-1.5 pr-2 border-r border-white/[0.04]">
          {['Dashboard', 'Projects', 'Library', 'Settings'].map((n, i) => (
            <div key={n} className={`text-[11px] px-2.5 py-1.5 rounded-md ${i === 0 ? 'bg-gold-500/15 text-gold-200 border border-gold-500/30' : 'text-luxe/60'}`}>{n}</div>
          ))}
        </div>

        {/* Main */}
        <div className="col-span-12 sm:col-span-7 space-y-3">
          <div className="rounded-lg border border-gold-500/30 bg-gold-500/[0.06] p-3 sm:p-4">
            <div className="text-[9px] tracking-[0.3em] uppercase text-gold-300/90 mb-1">Hero · Faceless AI Studio</div>
            <div className="text-[15px] sm:text-lg text-luxe leading-tight">What do you want to <span className="text-gold-gradient">create</span> today?</div>
            <div className="mt-2 flex gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-luxe/70">Viral Reel</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-luxe/70">YT Script</span>
              <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-luxe/70">Storyboard</span>
            </div>
          </div>
          {/* Mini timeline bars */}
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2 flex items-center gap-1.5"><Film className="w-2.5 h-2.5 text-gold-300" /> Reel Timeline · 00:38</div>
            <div className="space-y-1.5">
              {[60, 85, 45, 70, 55].map((w, i) => (
                <div key={i} className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div className="h-full bg-gold-gradient" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 sm:col-span-3 space-y-3">
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[9px] tracking-[0.25em] uppercase text-gold-300/90 mb-1.5">Analytics</div>
            <div className="font-display text-2xl text-gold-gradient">+312%</div>
            <div className="text-[10px] text-muted-foreground">Reach · last 14 days</div>
            <div className="mt-2 flex items-end gap-0.5 h-8">
              {[30, 45, 38, 60, 55, 75, 90].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gold-500/40" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="hidden sm:block rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-1.5">Queue</div>
            <div className="flex items-center gap-1.5 text-[11px] text-luxe/85"><Loader2 className="w-3 h-3 text-gold-300 animate-spin" /> Rendering · 24s</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Static data ──────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { label: 'Topic Idea',         icon: Lightbulb },
  { label: 'Script Generation',  icon: Wand2 },
  { label: 'AI Visuals',         icon: ImageIcon },
  { label: 'Voiceover',          icon: Mic2 },
  { label: 'Video Editing',      icon: Film },
  { label: 'Captions',           icon: Captions },
  { label: 'Publish',            icon: Send },
]

const FEATURES: { title: string; desc: string; icon: any; coming?: boolean }[] = [
  { title: 'AI Script Writer',     desc: 'Cinematic screenplay-grade scripts in seconds. Hooks tuned for retention.', icon: Wand2 },
  { title: 'AI Image Generator',   desc: 'On-brand B-roll, thumbnails, and storyboard frames — generated, not stocked.', icon: ImageIcon, coming: true },
  { title: 'Voice Cloning',         desc: 'Narrator-grade voiceovers. Match your tone or pick a signature voice.', icon: Mic2, coming: true },
  { title: 'Reel Generator',        desc: 'Beat-matched cuts, motion templates, vertical aspect — auto-assembled.', icon: Film, coming: true },
  { title: 'Auto Captions',         desc: 'Word-level timing, broll-aware emphasis, brand fonts baked in.', icon: Captions, coming: true },
  { title: 'Instagram Publisher',   desc: 'Direct publish to feed, reels, or carousel — schedule or fire instantly.', icon: Instagram },
  { title: 'YouTube Publisher',     desc: 'Long-form and Shorts upload with metadata, chapters, and thumbnails.', icon: Youtube },
  { title: 'Analytics Dashboard',   desc: 'Per-post performance, niche benchmarks, and what to do next — by AI.', icon: BarChart3, coming: true },
  { title: 'Voice-First Assistant', desc: 'Ask Mugtee in voice. Get scripts, plans, hooks. Hear them back instantly.', icon: Volume2 },
]

const STATS = [
  { value: '10×',  label: 'Faster workflow' },
  { value: '80%',  label: 'Editing reduction' },
  { value: '30d→1h', label: 'A month of content in one hour' },
]

const PRICING: { name: string; price: string; unit: string; tagline: string; features: string[]; cta: string; highlight: boolean; ctaHref?: string }[] = [
  {
    name: 'Starter', price: 'Free', unit: '', tagline: 'Try the workflow, no card needed.',
    features: ['25 AI generations / month', '5 cinematic scripts / month', 'Instagram + YouTube preview', 'Voice-first assistant'],
    cta: 'Start Free', highlight: false,
  },
  {
    name: 'Pro', price: '₹245', unit: ' / mo', tagline: 'The unfair advantage for serious creators.',
    features: ['Unlimited AI generations', 'Longform cinematic scripts', 'Auto-publish to IG + YouTube', 'Voice cloning + read-aloud', 'Priority cinematic rendering'],
    cta: 'Get Pro', highlight: true,
  },
  {
    name: 'Agency', price: '₹999', unit: ' / mo', tagline: 'For studios shipping at volume.',
    features: ['Everything in Pro', 'Multi-brand workspaces', 'Team workflows + roles', 'White-glove onboarding'],
    cta: 'Talk to Us', highlight: false, ctaHref: 'mailto:hello@mugtee.in?subject=Mugtee%20Agency%20Plan',
  },
]
