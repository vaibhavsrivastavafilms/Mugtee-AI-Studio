'use client'

import Link from 'next/link'
import { TrendingUp, Layers, Sparkles } from 'lucide-react'
import {
  POPULAR_CREATOR_FORMATS,
  RECENT_NICHE_SIGNALS,
  TRENDING_CINEMATIC_STYLES,
  nicheLabel,
} from '@/lib/showcase/examples'
import type { CinematicNiche } from '@/lib/cinematic/niches'

export function CreatorTrustLayer() {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-black/15 p-5 sm:p-6 space-y-5">
      <div className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-300">
        <Sparkles className="w-3 h-3" /> Creator signals
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrustColumn
          icon={TrendingUp}
          title="Trending cinematic styles"
          items={TRENDING_CINEMATIC_STYLES.map((s) => ({
            label: s.label,
            sub: s.mood,
          }))}
        />
        <TrustColumn
          icon={Layers}
          title="Popular creator formats"
          items={POPULAR_CREATOR_FORMATS.map((f) => ({
            label: f.label,
            sub: f.duration,
          }))}
        />
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-luxe/55">
            <Sparkles className="w-3 h-3 text-gold-400/70" />
            Recently explored niches
          </div>
          <div className="flex flex-wrap gap-2">
            {RECENT_NICHE_SIGNALS.map((niche) => (
              <Link
                key={niche}
                href="/cinematic/create"
                className="px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] text-[10px] tracking-wider uppercase text-luxe/70 hover:border-gold-500/30 hover:text-gold-200 transition"
              >
                {nicheLabel(niche as CinematicNiche)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustColumn({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof TrendingUp
  title: string
  items: Array<{ label: string; sub: string }>
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-luxe/55">
        <Icon className="w-3 h-3 text-gold-400/70" />
        {title}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2"
          >
            <div className="text-sm text-luxe/85">{item.label}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
