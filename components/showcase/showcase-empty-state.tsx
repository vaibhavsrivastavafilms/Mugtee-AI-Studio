'use client'

import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { SHOWCASE_EXAMPLES, nicheLabel } from '@/lib/showcase/examples'

export function ShowcaseEmptyState() {
  const picks = SHOWCASE_EXAMPLES.slice(0, 3)

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/15 p-6 sm:p-8 space-y-6">
      <div className="text-center max-w-md mx-auto">
        <Sparkles className="w-5 h-5 text-gold-400/40 mx-auto mb-3" />
        <p className="font-display text-[15px] text-luxe/80 italic leading-snug">
          Your next cinematic story starts here.
        </p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Direct stories, not dashboards. Start with one emotional idea — Mugtee carries the hook, beats, and frames.
        </p>
        <Link
          href="/quick-cut/preview"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold-gradient text-black text-[12px] font-medium shadow-gold-glow hover:opacity-90 transition min-h-[44px]"
        >
          <Sparkles className="w-3.5 h-3.5" /> Direct your first reel
        </Link>
        <p className="mt-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/80">
          Or explore a curated example below
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {picks.map((example) => (
          <Link
            key={example.slug}
            href={`/cinematic/examples/${example.slug}`}
            className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-gold-500/25 transition"
          >
            <div className="text-[9px] tracking-[0.22em] uppercase text-gold-300/80 mb-2">
              {nicheLabel(example.niche)}
            </div>
            <div className="text-sm text-luxe/85 font-medium leading-snug group-hover:text-gold-100 transition">
              {example.title}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground italic line-clamp-2">
              {example.hook}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-muted-foreground group-hover:text-gold-300 transition">
              View example <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
