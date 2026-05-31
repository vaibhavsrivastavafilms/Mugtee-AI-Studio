'use client'

import { motion } from 'framer-motion'
import { Captions, Clapperboard, FileText, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SHOWCASE_EXAMPLES } from '@/lib/proof/showcase-examples'

const SUCCESS_CARDS = [
  {
    key: 'documentary-script',
    title: 'Documentary Script Generated',
    icon: FileText,
    example: SHOWCASE_EXAMPLES.find((e) => e.id === 'apple-design-bet')!,
    snippetKey: 'scriptPreview' as const,
  },
  {
    key: 'viral-reel',
    title: 'Viral Reel Created',
    icon: Sparkles,
    example: SHOWCASE_EXAMPLES.find((e) => e.id === 'nokia-failed')!,
    snippetKey: 'hook' as const,
  },
  {
    key: 'storyboard',
    title: 'Storyboard Completed',
    icon: Clapperboard,
    example: SHOWCASE_EXAMPLES.find((e) => e.id === 'psychology-attention')!,
    snippetKey: 'thumbnailIdea' as const,
  },
  {
    key: 'caption',
    title: 'Caption Generated',
    icon: Captions,
    example: SHOWCASE_EXAMPLES.find((e) => e.id === 'discipline-identity')!,
    snippetKey: 'captionPreview' as const,
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
}

export function SuccessProofCards({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 py-14 sm:py-20 border-y border-[var(--v2-border,rgba(255,255,255,0.06))]',
        className
      )}
      aria-labelledby="success-proof-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center mb-10 sm:mb-12 max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.32em] uppercase text-[var(--v2-gold,#d4af37)] mb-3">
            Example outcomes
          </p>
          <h2
            id="success-proof-heading"
            className="font-display text-2xl sm:text-3xl lg:text-4xl text-[var(--v2-text-primary,#F4E7C1)]"
          >
            From idea to{' '}
            <span className="italic text-[var(--v2-gold,#d4af37)]">export-ready</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--v2-text-secondary,rgba(244,231,193,0.6))]">
            Illustrative outputs from Mugtee showcase examples — not real user submissions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {SUCCESS_CARDS.map((card, index) => {
            const Icon = card.icon
            const snippet = card.example[card.snippetKey]
            return (
              <motion.div
                key={card.key}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.04 }}
              >
                <Card
                  className={cn(
                    'h-full border-[var(--v2-border,rgba(255,255,255,0.08))]',
                    'bg-[var(--v2-surface,rgba(255,255,255,0.02))] overflow-hidden',
                    'hover:border-[var(--v2-gold,#d4af37)]/30 transition-colors duration-200'
                  )}
                >
                  <div
                    className="aspect-[16/9] border-b border-[var(--v2-border,rgba(255,255,255,0.06))] p-4 flex flex-col justify-end"
                    style={{
                      backgroundImage: card.example.storyboardPreview[0]
                        ? `linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.25)), url(${card.example.storyboardPreview[0]})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <Badge
                      variant="outline"
                      className="w-fit border-[var(--v2-gold,#d4af37)]/30 bg-black/50 text-[8px] tracking-[0.16em] uppercase text-[var(--v2-gold,#d4af37)]"
                    >
                      Example
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="w-4 h-4 text-[var(--v2-gold,#d4af37)]/70 shrink-0"
                        aria-hidden
                      />
                      <h3 className="font-display text-sm text-[var(--v2-text-primary,#F4E7C1)] leading-snug">
                        {card.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-[var(--v2-text-secondary,rgba(244,231,193,0.45))] line-clamp-1">
                      Topic: {card.example.topic}
                    </p>
                    <p className="text-xs text-[var(--v2-text-secondary,rgba(244,231,193,0.65))] line-clamp-3 leading-relaxed">
                      {snippet}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
