import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Brain, Film, Layers, Zap, Crown, ArrowRight, Heart } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About',
  description: 'Mugtee is the cinematic AI production OS built for the next generation of creators, agencies, and faceless brands.',
}

export default function AboutPage() {
  return (
    <>
      <div className="mb-10">
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 mb-2">Made for creators</div>
        <h1 className="font-display text-4xl sm:text-5xl mb-4">
          About <span className="text-gold-gradient">Mugtee</span>
        </h1>
        <p className="text-base text-luxe/85 leading-relaxed max-w-xl">
          We build the production hub we wished we had — cinematic, fast, and quietly powerful. One workspace where ideas become scripts, scripts become schedules, schedules become published content.
        </p>
      </div>

      {/* Phase V1.2 — Trust Fix #8: Founder story */}
      <section className="glass-strong rounded-2xl p-6 sm:p-8 mb-5 border border-gold-500/25">
        <div className="flex items-start gap-5">
          <div className="hidden sm:flex w-14 h-14 shrink-0 rounded-2xl bg-gold-gradient items-center justify-center shadow-gold-glow">
            <span className="font-display text-xl text-black font-black">V</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-gold-300" />
              <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80">Founder · Vaibhav</div>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl mb-3">A filmmaker, frustrated.</h2>
            <p className="text-sm text-luxe/90 leading-relaxed mb-3">
              I'm Vaibhav — a filmmaker, not a SaaS founder. I started Mugtee because I was tired of jumping between seven different AI tools just to get one cinematic reel out the door. Tabs for scripting, tabs for B-roll, tabs for voiceover, tabs for publishing. None of them spoke to each other. All of them charged separately.
            </p>
            <p className="text-sm text-luxe/90 leading-relaxed mb-3">
              I built Mugtee as the workspace I wish had existed when I shot my first faceless documentary. One cinematic environment where the AI actually understands your niche, where every output is craftsman-grade, and where you ship — not just generate.
            </p>
            <p className="text-sm text-luxe/85 leading-relaxed">
              Mugtee is creator-first because <span className="text-gold-200">it's built by a creator</span>. Every UI decision, every prompt, every shortcut — designed to make your hour count more than your last hour did.
            </p>
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-6 sm:p-8 mb-5 border border-gold-500/15">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-gold-300" />
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80">Why we built it</div>
        </div>
        <p className="text-sm text-luxe/90 leading-relaxed mb-3">
          Most creators waste 70% of their time on workflow — not creating. Tab-hopping between docs, spreadsheets, calendars, and uploaders. We thought it was crazy that a $250B creator economy still ran on duct tape.
        </p>
        <p className="text-sm text-luxe/90 leading-relaxed">
          Mugtee is one cinematic workspace where every part of your production pipeline lives — from the first viral idea to the final published video.
        </p>
      </section>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        {[
          { icon: Brain,  title: 'AI that gets your niche',  desc: 'Faceless intelligence engine decodes the storytelling DNA of viral formats in your space.' },
          { icon: Film,   title: 'Cinematic by default',     desc: 'Dark, premium UI — because creators deserve tools that feel as crafted as their content.' },
          { icon: Layers, title: 'One pipeline, every stage',desc: 'Ideas → scripts → shoots → edits → schedule → publish — all in one Kanban + calendar.' },
          { icon: Zap,    title: 'Built for speed',           desc: 'Optimistic UI, real-time sync, sub-second AI. No spinners. No friction.' },
        ].map((f) => (
          <div key={f.title} className="glass rounded-xl p-5 border border-white/[0.05] hover:border-gold-500/30 transition">
            <div className="w-9 h-9 rounded-lg glass-gold flex items-center justify-center mb-3">
              <f.icon className="w-4 h-4 text-gold-300" />
            </div>
            <div className="font-display text-lg mb-1">{f.title}</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <section className="glass rounded-2xl p-6 sm:p-8 mb-8 border border-white/[0.05]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-gold-300" />
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80">The stack</div>
        </div>
        <p className="text-sm text-luxe/85 leading-relaxed mb-3">
          Next.js 14 · Supabase (Auth + Postgres + Realtime) · OpenAI GPT-4o-mini · Anthropic Claude 3.5 Sonnet · YouTube Data API v3 · Meta Graph API · Razorpay
        </p>
        <p className="text-xs text-muted-foreground">
          Built deliberately for creators in India and globally — premium pricing in ₹, world-class UX.
        </p>
      </section>

      <div className="glass-strong rounded-2xl p-7 sm:p-9 border border-gold-500/25 text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold-gradient shadow-gold-glow mb-4">
          <Crown className="w-5 h-5 text-black" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl mb-2">Start your production hub</h2>
        <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">Free to try. Upgrade anytime. Cancel anytime. No credit card required to start.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold-gradient text-black text-sm font-semibold tracking-wide shadow-gold-glow hover:opacity-90 transition">
            <Sparkles className="w-4 h-4" /> Start creating <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/pricing" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg glass border-gold-soft hover:border-gold-500/40 text-luxe text-sm tracking-wide transition">
            See pricing
          </Link>
        </div>
      </div>
    </>
  )
}
