'use client'
// Phase — Cinematic landing page (client component, split for SSR-friendly motion).
// Sections: NAV · HERO · WORKFLOW · FEATURES · SOCIAL PROOF · PRICING · FINAL CTA · FOOTER
// All tokens reuse the existing design system. No new deps.

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Sparkles, Play, ArrowRight, Wand2, Image as ImageIcon, Mic2, Film,
  Captions, Volume2, Check, Loader2,
  Instagram, Youtube, Twitter, Mail,
} from 'lucide-react'
import { EmailCapture } from '@/components/landing/email-capture'
import ProofSections from '@/components/landing/proof-sections'
import CinematicShowcase from '@/components/landing/cinematic-showcase'
import {
  CinematicJourneySection,
  CreatorIdentitySection,
  StoryUniverseSection,
  ImmersiveViewingSection,
  StorytellingOperatingSystemSection,
} from '@/components/landing/phase5-site-sections'
import { FeaturedCreations } from '@/components/showcase/featured-creations'
import { CinematicOutputPreviewStrip } from '@/components/showcase/cinematic-output-preview-strip'
import { HomeTrustLayer } from '@/components/landing/home-trust-layer'
import { MobileStickyCta } from '@/components/landing/mobile-sticky-cta'
import { HERO, PRICING as PRICING_COPY, FINAL_CTA, FOOTER, ATMOSPHERE_STATS } from '@/lib/marketing/site-copy'

// Small fade-up helper — keeps animation system lightweight.
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as any },
}

export default function LandingClient() {
  return (
    <div className="relative min-h-screen bg-background text-luxe overflow-x-hidden pb-24 sm:pb-0">
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
            <a href="#featured-creations" className="hover:text-gold-300 transition">Worlds</a>
            <a href="#journey" className="hover:text-gold-300 transition">Journey</a>
            <a href="#identity" className="hover:text-gold-300 transition">Identity</a>
            <a href="#philosophy" className="hover:text-gold-300 transition">Philosophy</a>
            <a href="#pricing" className="hover:text-gold-300 transition">Access</a>
            <Link href="/blog" className="hover:text-gold-300 transition">Journal</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex text-[12px] tracking-wider uppercase text-luxe/80 hover:text-gold-300 transition px-2 py-2">Sign in</Link>
            <Link href="/quick-cut/preview" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gold-gradient text-black text-[12px] font-medium shadow-gold-glow hover:opacity-90 transition-opacity">
              {HERO.primaryCta} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-6 pt-14 sm:pt-24 pb-20 sm:pb-28">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-gold-500/30 text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-7 sm:mb-8">
              <Sparkles className="w-3 h-3" /> {HERO.badge}
            </span>
            <h1 className="font-display text-[clamp(2.25rem,5.8vw,4.35rem)] leading-[1.06] tracking-tight">
              {HERO.headline.split('.')[0]}.{' '}
              <span className="text-gold-gradient block sm:inline mt-1 sm:mt-0">{HERO.headlineAccent}</span>
            </h1>
            <p className="mt-6 sm:mt-7 text-base sm:text-lg text-luxe/70 leading-relaxed max-w-2xl mx-auto">
              {HERO.subheadline}
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto">
              <Link
                href="/quick-cut/preview"
                className="group inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-xl bg-gold-gradient text-black text-sm sm:text-base font-medium shadow-gold-glow hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-4 h-4" /> {HERO.primaryCta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href="#featured-creations" className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-lg bg-white/[0.035] border border-white/[0.08] text-[12.5px] text-luxe/85 hover:bg-white/[0.07] hover:border-gold-500/40 transition">
                <Play className="w-3.5 h-3.5 text-gold-300" /> {HERO.secondaryCta}
              </a>
            </div>
            <div className="mt-6 text-[11px] tracking-widest uppercase text-muted-foreground/70">
              {HERO.trust}
            </div>

            <CreatorTrustStrip />
          </motion.div>

          {/* Hero visual — faux dashboard preview */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-14 sm:mt-20 max-w-5xl mx-auto"
          >
            <DashboardMock />
            {/* Floating glass cards — subtle CSS float animation */}
            <FloatingCard className="hidden sm:flex absolute -left-6 lg:-left-16 top-1/4" icon={<Wand2 className="w-3.5 h-3.5 text-gold-300" />} label="Hook held" value="Emotional opener · Scene 1" delay="0s" />
            <FloatingCard className="hidden sm:flex absolute -right-4 lg:-right-14 top-12" icon={<Film className="w-3.5 h-3.5 text-amber-300" />} label="Storyboard frame" value="9:16 · warm key light" delay="-1.4s" />
            <FloatingCard className="hidden sm:flex absolute -right-6 lg:-right-20 bottom-14" icon={<Captions className="w-3.5 h-3.5 text-gold-300" />} label="Presentation" value="Atmosphere · captions held" delay="-2.8s" />
            <FloatingCard className="hidden sm:flex absolute -left-3 lg:-left-12 bottom-8" icon={<Volume2 className="w-3.5 h-3.5 text-gold-300" />} label="Voice direction" value="Warm · documentary pace" delay="-2.1s" />
          </motion.div>
        </div>
      </section>

      <CinematicOutputPreviewStrip />

      {/* ─── PROOF: How it works · Output preview · Made for · CTA ─ */}
      {/* V2C — Cinematic Showcase: emotional proof immediately after hero */}
      <FeaturedCreations />
      <CinematicShowcase />

      <ProofSections />

      <HomeTrustLayer />

      <CinematicJourneySection />

      <CreatorIdentitySection />
      <StoryUniverseSection />
      <ImmersiveViewingSection />

      {/* ─── ATMOSPHERE ──────────────────────────────────────────── */}
      <section className="relative px-5 sm:px-6 py-20 sm:py-28">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">Cinematic presence</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">
              Storytelling that <span className="text-gold-gradient">breathes</span>.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-luxe/65">
              Atmosphere, rhythm, and visual identity — held with editorial restraint.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-10">
            {ATMOSPHERE_STATS.map((s) => (
              <motion.div key={s.label} {...fadeUp} className="rounded-2xl glass-strong border border-gold-soft p-6 sm:p-7 text-center story-experience-depth">
                <div className="font-display text-4xl sm:text-5xl text-gold-gradient mb-1.5">{s.value}</div>
                <div className="text-[11px] tracking-widest uppercase text-luxe/70">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="rounded-2xl p-6 sm:p-7 bg-white/[0.025] border border-white/[0.05] text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/25 text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-3">
              <Sparkles className="w-3 h-3" /> Voices from the studio
            </div>
            <h3 className="font-display text-xl sm:text-2xl leading-tight mb-2">
              Creator reflections, <span className="text-gold-gradient">coming quietly</span>.
            </h3>
            <p className="text-luxe/65 text-sm leading-relaxed">
              We&apos;re inviting our first storytellers to share honest reflections on directing with Mugtee.{' '}
              <a href="mailto:hello@mugtee.in" className="text-gold-300 hover:text-gold-200 transition underline-offset-4 hover:underline">Write to us</a> if you&apos;d like to be among them.
            </p>
          </motion.div>
        </div>
      </section>

      <StorytellingOperatingSystemSection />

      {/* ─── ACCESS ──────────────────────────────────────────────── */}
      <section id="pricing" className="relative px-5 sm:px-6 py-20 sm:py-28">
        <div className="container max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3">{PRICING_COPY.eyebrow}</div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight">
              Calm access to the <span className="text-gold-gradient">cinematic studio</span>.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {PRICING_COPY.tiers.map((p) => (
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
                    Studio
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
                {'ctaHref' in p && p.ctaHref ? (
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
              {FINAL_CTA.headline.split(' ').slice(0, 3).join(' ')}{' '}
              <span className="text-gold-gradient">{FINAL_CTA.headline.split(' ').slice(3).join(' ')}</span>
            </h2>
            <p className="mt-5 text-luxe/70 max-w-lg mx-auto text-sm sm:text-base">
              {FINAL_CTA.subheadline}
            </p>
            <Link href="/quick-cut/preview" className="mt-8 inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 rounded-lg bg-gold-gradient text-black text-sm font-medium shadow-gold-glow hover:opacity-90 transition-opacity">
              {FINAL_CTA.cta} <ArrowRight className="w-4 h-4" />
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
            <span>© {new Date().getFullYear()} Mugtee · {FOOTER.tagline}</span>
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

      <MobileStickyCta />

      {/* Local CSS — pure CSS float (no JS, no animation library cost) */}
      <style>{`
        @keyframes float-y { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        .float { animation: float-y 6s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────

function CreatorTrustStrip() {
  return (
    <div className="mt-10 sm:mt-12 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
      {HERO.signals.map((signal) => (
        <span
          key={signal}
          className="px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-luxe/50"
        >
          {signal}
        </span>
      ))}
    </div>
  )
}

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
        <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">mugtee.in · storytelling operating system</div>
        <div className="w-12" />
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-12 gap-3 sm:gap-4 bg-gradient-to-b from-background to-black/40 min-h-[260px] sm:min-h-[420px]">
        {/* Sidebar */}
        <div className="hidden sm:flex col-span-2 flex-col gap-1.5 pr-2 border-r border-white/[0.04]">
          {['Worlds', 'Storyboards', 'Voice', 'Presentation'].map((n, i) => (
            <div key={n} className={`text-[11px] px-2.5 py-1.5 rounded-md ${i === 0 ? 'bg-gold-500/15 text-gold-200 border border-gold-500/30' : 'text-luxe/60'}`}>{n}</div>
          ))}
        </div>

        {/* Main */}
        <div className="col-span-12 sm:col-span-7 space-y-3">
          <div className="rounded-lg border border-gold-500/30 bg-gold-500/[0.06] p-3 sm:p-4">
            <div className="text-[9px] tracking-[0.3em] uppercase text-gold-300/90 mb-1">Direct</div>
            <div className="text-[15px] sm:text-lg text-luxe leading-tight">What cinematic world do you want to <span className="text-gold-gradient">author</span>?</div>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-luxe/70">Psychology reel</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-luxe/70">Luxury mood</span>
              <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-luxe/70">Storyboard</span>
            </div>
          </div>
          {/* Mini timeline bars */}
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-2 flex items-center gap-1.5"><Film className="w-2.5 h-2.5 text-gold-300" /> Scene beats · 4 frames</div>
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
            <div className="text-[9px] tracking-[0.25em] uppercase text-gold-300/90 mb-1.5">Visual mood</div>
            <div className="font-display text-lg text-gold-gradient italic leading-snug">Warm gold · slow drift</div>
            <div className="text-[10px] text-muted-foreground mt-1">Storyboard aligned · 9:16</div>
          </div>
          <div className="hidden sm:block rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground mb-1.5">Presentation</div>
            <div className="flex items-center gap-1.5 text-[11px] text-luxe/85"><Loader2 className="w-3 h-3 text-gold-300 animate-spin" /> Atmosphere held</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Static data removed — Phase 5 uses lib/marketing/site-copy.ts ───
