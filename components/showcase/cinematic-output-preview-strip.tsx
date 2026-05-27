'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Captions, FileText, Film, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { OUTPUT_PREVIEW } from '@/lib/marketing/site-copy'
import {
  getOutputPreviewCards,
  nicheLabel,
} from '@/lib/showcase/examples'

const cards = getOutputPreviewCards(5)

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
}

export function CinematicOutputPreviewStrip() {
  return (
    <section id="output-preview" className="relative px-5 sm:px-6 py-14 sm:py-16">
      <div className="container max-w-6xl mx-auto">
        <motion.div {...fadeUp} className="mb-8 sm:mb-10 max-w-2xl">
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-2">
            {OUTPUT_PREVIEW.eyebrow}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl leading-tight">
            {OUTPUT_PREVIEW.headline.split(' ').slice(0, -1).join(' ')}{' '}
            <span className="text-gold-gradient">{OUTPUT_PREVIEW.headline.split(' ').slice(-1)[0]}</span>.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-luxe/60 leading-relaxed">
            {OUTPUT_PREVIEW.subheadline}
          </p>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto scroll-touch scrollbar-luxe pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {cards.map((card, i) => (
            <motion.article
              key={card.slug}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: Math.min(i * 0.06, 0.24) }}
              className="snap-start shrink-0 w-[88vw] sm:w-[340px] rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/30 shadow-[0_0_40px_rgba(0,0,0,0.25)] overflow-hidden"
            >
              <Link href={`/cinematic/examples/${card.slug}`} className="block group">
                <div className="relative aspect-[16/10] bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black border-b border-white/[0.06]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.12),transparent_55%)]" />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/55 border border-white/[0.08] text-[9px] tracking-[0.2em] uppercase text-gold-300/90">
                    {nicheLabel(card.niche)}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] tracking-[0.18em] uppercase text-luxe/50">
                      <Film className="w-3 h-3" /> {card.frameLabel}
                    </div>
                    <p className="text-[11px] text-luxe/70 italic line-clamp-2 leading-snug">
                      {card.visualPrompt}
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3">
                  <PreviewRow icon={Zap} label="Hook">
                    <p className="font-display text-[14px] italic text-luxe/90 line-clamp-2 leading-snug group-hover:text-gold-100 transition">
                      {card.hook}
                    </p>
                  </PreviewRow>
                  <PreviewRow icon={FileText} label="Script">
                    <p className="text-[12px] text-luxe/65 line-clamp-2 leading-relaxed">
                      {card.scriptSnippet}
                    </p>
                  </PreviewRow>
                  <PreviewRow icon={Captions} label="Caption">
                    <p className="text-[12px] text-luxe/60 line-clamp-2 leading-relaxed">
                      {card.captionPreview}
                    </p>
                  </PreviewRow>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground pt-1">
                    {card.coverMood}
                  </p>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PreviewRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Zap
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-gold-300/75 mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      {children}
    </div>
  )
}
