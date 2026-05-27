import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Brain, Film, Layers, Zap, Crown, ArrowRight, Heart } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About',
  description: 'Mugtee is the cinematic storytelling operating system for emotional visual storytellers.',
}

export default function AboutPage() {
  return (
    <>
      <div className="mb-10">
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 mb-2">Storytelling infrastructure</div>
        <h1 className="font-display text-4xl sm:text-5xl mb-4">
          About <span className="text-gold-gradient">Mugtee</span>
        </h1>
        <p className="text-base text-luxe/85 leading-relaxed max-w-xl">
          We build the cinematic storytelling environment we wished existed — emotionally immersive, editorially restrained, and creator-owned. One place where ideas become worlds.
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
              I&apos;m Vaibhav — a filmmaker. I started Mugtee because cinematic storytelling kept fragmenting across disconnected tools — scripting in one place, storyboards in another, presentation somewhere else. None of it held atmosphere together.
            </p>
            <p className="text-sm text-luxe/90 leading-relaxed mb-3">
              I built Mugtee as the environment I wished had existed when I directed my first documentary reel — one cinematic world where emotional sequencing, visual authorship, and immersive presentation live together.
            </p>
            <p className="text-sm text-luxe/85 leading-relaxed">
              Mugtee is creator-first because <span className="text-gold-200">it&apos;s built by a storyteller</span>. Every decision serves atmosphere, rhythm, and authorship — not hustle.
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
          Storytelling deserves infrastructure that feels cinematic — not scattered across tabs, dashboards, and uploaders held together with duct tape.
        </p>
        <p className="text-sm text-luxe/90 leading-relaxed">
          Mugtee is one storytelling operating system where emotional ideas become directed worlds — preserved, experienced, and evolved with atmosphere intact.
        </p>
      </section>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        {[
          { icon: Brain,  title: 'Storytelling that knows your voice',  desc: 'Emotional authorship held across sessions — recognizable, atmospherically yours.' },
          { icon: Film,   title: 'Cinematic by default',     desc: 'Dark, premium, editorial — because storytellers deserve environments as crafted as their worlds.' },
          { icon: Layers, title: 'One arc, every stage',desc: 'Imagine → Direct → Sequence → Author → Preserve → Experience → Share → Evolve.' },
          { icon: Zap,    title: 'Calm and present',           desc: 'Restrained motion, emotional pacing, uninterrupted immersion — never dashboard noise.' },
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
