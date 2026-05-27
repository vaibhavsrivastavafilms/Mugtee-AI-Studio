'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  CREATOR_TYPE_SHOWCASE,
  HOMEPAGE_TRUST_LINES,
  SHOWCASE_EXAMPLES,
  nicheLabel,
} from '@/lib/showcase/examples'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.5 },
}

export function HomeTrustLayer() {
  const workflowExamples = SHOWCASE_EXAMPLES.slice(0, 3)

  return (
    <section className="relative px-5 sm:px-6 py-12 sm:py-16 border-y border-white/[0.04] bg-black/20">
      <div className="container max-w-6xl mx-auto space-y-8">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {HOMEPAGE_TRUST_LINES.map((line) => (
              <span
                key={line}
                className="px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[9px] sm:text-[10px] tracking-[0.16em] uppercase text-luxe/55"
              >
                {line}
              </span>
            ))}
          </div>
          <p className="text-sm sm:text-base text-luxe/60 leading-relaxed">
            Mugtee is a cinematic storytelling operating system — structured for emotional worlds, not content factories.
          </p>
        </motion.div>

        <motion.div {...fadeUp} className="space-y-3">
          <div className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85 text-center">
            Storytelling voices
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {CREATOR_TYPE_SHOWCASE.map((item) => (
              <span
                key={item.label}
                className="px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-left min-w-[140px]"
              >
                <span className="block text-[10px] tracking-wider uppercase text-gold-300/80">
                  {item.label}
                </span>
                <span className="block text-[11px] text-luxe/55 mt-0.5">{item.example}</span>
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeUp} className="space-y-3">
          <div className="text-[10px] tracking-[0.28em] uppercase text-gold-300/85 text-center">
            Authored worlds
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {workflowExamples.map((example) => (
              <Link
                key={example.slug}
                href={`/cinematic/examples/${example.slug}`}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-gold-500/30 transition"
              >
                <div className="text-[9px] tracking-[0.22em] uppercase text-gold-300/80 mb-1">
                  {nicheLabel(example.niche)}
                </div>
                <div className="text-sm text-luxe/85 font-medium leading-snug group-hover:text-gold-100 transition">
                  {example.title}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground italic line-clamp-2">
                  {example.hook}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-muted-foreground group-hover:text-gold-300 transition">
                  View case study <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
