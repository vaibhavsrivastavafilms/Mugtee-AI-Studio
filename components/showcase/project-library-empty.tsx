'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import {
  CREATOR_TYPE_SHOWCASE,
  SHOWCASE_EXAMPLES,
  STARTER_PROMPT_CHIPS,
  nicheLabel,
} from '@/lib/showcase/examples'

export function ProjectLibraryEmpty() {
  const examples = SHOWCASE_EXAMPLES.slice(0, 3)
  const niches = CREATOR_TYPE_SHOWCASE.slice(0, 4)

  return (
    <div className="rounded-2xl border border-white/[0.05] bg-black/15 p-6 sm:p-8 space-y-6">
      <div className="text-center max-w-md mx-auto">
        <Sparkles className="w-5 h-5 text-gold-400/40 mx-auto mb-3" />
        <p className="font-display text-[15px] text-luxe/80 italic leading-snug">
          Your future projects will appear here.
        </p>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Direct your first cinematic story — saved reels, storyboards, and exports stay in your workspace.
        </p>
        <Link
          href="/cinematic/create"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold-gradient text-black text-[12px] font-medium shadow-gold-glow hover:opacity-90 transition min-h-[44px]"
        >
          <Sparkles className="w-3.5 h-3.5" /> Direct your first reel
        </Link>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/80 text-center">
          Suggested creator niches
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {niches.map((niche) => (
            <Link
              key={niche.label}
              href="/cinematic/create"
              className="px-3 py-2 rounded-full border border-white/[0.06] bg-white/[0.02] text-[11px] text-luxe/60 hover:border-gold-500/25 hover:text-gold-200 transition"
            >
              {niche.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/80 text-center">
          Cinematic starter examples
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {examples.map((example) => (
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

      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {STARTER_PROMPT_CHIPS.slice(0, 3).map((chip) => (
          <Link
            key={chip.label}
            href={`/cinematic/create?prompt=${encodeURIComponent(chip.prompt)}`}
            className="px-3 py-1.5 rounded-full border border-white/[0.06] text-[10px] text-luxe/50 hover:text-gold-200 hover:border-gold-500/25 transition"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
