'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { FEATURED } from '@/lib/marketing/site-copy'
import {
  SHOWCASE_EXAMPLES,
  nicheLabel,
} from '@/lib/showcase/examples'

export function FeaturedCreations() {
  return (
    <section id="featured-creations" className="relative px-5 sm:px-6 py-16 sm:py-20">
      <div className="container max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-2">
              {FEATURED.eyebrow}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl leading-tight">
              {FEATURED.headline.split(' ').slice(0, 2).join(' ')}{' '}
              <span className="text-gold-gradient">{FEATURED.headline.split(' ').slice(2).join(' ')}</span>
            </h2>
            <p className="mt-2 text-sm text-luxe/55 max-w-md leading-relaxed hidden sm:block">
              {FEATURED.subheadline}
            </p>
          </div>
          <Link
            href="/quick-cut/preview"
            className="hidden sm:inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-muted-foreground hover:text-gold-300 transition shrink-0"
          >
            Direct your world <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto scroll-touch scrollbar-luxe pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {SHOWCASE_EXAMPLES.map((example, i) => (
            <motion.div
              key={example.slug}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.25) }}
              className="snap-start shrink-0 w-[78vw] sm:w-[320px]"
            >
              <Link
                href={`/cinematic/examples/${example.slug}`}
                className="group block h-full rounded-2xl overflow-hidden border border-gold-soft/40 bg-black/30 hover:border-gold-500/40 transition"
              >
                <div className="relative aspect-[4/5] bg-gradient-to-br from-zinc-900 via-[#1a1208] to-black">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/55 border border-white/[0.08] text-[9px] tracking-[0.22em] uppercase text-gold-300/90">
                    {nicheLabel(example.niche)}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-luxe/50 line-clamp-1">
                      {example.hook}
                    </p>
                    <p className="text-[9px] tracking-[0.18em] uppercase text-gold-300/70">
                      {example.coverMood}
                    </p>
                    <h3 className="font-display text-lg leading-snug text-luxe group-hover:text-gold-100 transition">
                      {example.title}
                    </h3>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
