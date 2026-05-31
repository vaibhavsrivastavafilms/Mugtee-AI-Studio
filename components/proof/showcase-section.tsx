'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  SHOWCASE_EXAMPLES,
  proofNicheLabel,
  type ProofShowcaseExample,
} from '@/lib/proof/showcase-examples'
import { ExamplePreviewModal } from '@/components/proof/example-preview-modal'

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
}

export function ShowcaseSection({ className }: { className?: string }) {
  const [selected, setSelected] = useState<ProofShowcaseExample | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const openExample = (example: ProofShowcaseExample) => {
    setSelected(example)
    setModalOpen(true)
  }

  return (
    <>
      <section
        id="see-what-mugtee-creates"
        className={cn(
          'relative px-5 sm:px-6 py-14 sm:py-20 border-y border-[var(--v2-border,rgba(255,255,255,0.06))]',
          className
        )}
        aria-labelledby="showcase-section-heading"
      >
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center mb-10 sm:mb-12 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--v2-gold,#d4af37)]/5 border border-[var(--v2-gold,#d4af37)]/25 text-[10px] tracking-[0.28em] uppercase text-[var(--v2-gold,#d4af37)] mb-4">
              <Sparkles className="w-3 h-3" aria-hidden />
              Creator proof
            </div>
            <h2
              id="showcase-section-heading"
              className="font-display text-2xl sm:text-3xl lg:text-4xl text-[var(--v2-text-primary,#F4E7C1)] leading-snug"
            >
              See What Mugtee{' '}
              <span className="italic text-[var(--v2-gold,#d4af37)]">Creates</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--v2-text-secondary,rgba(244,231,193,0.6))] leading-relaxed">
              Real output shapes — hooks, scripts, storyboards, and captions — before you spend a
              single credit.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {SHOWCASE_EXAMPLES.map((example, index) => (
              <motion.div
                key={example.id}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.04 }}
              >
                <button
                  type="button"
                  onClick={() => openExample(example)}
                  className="w-full text-left group"
                >
                  <Card
                    className={cn(
                      'h-full border-[var(--v2-border,rgba(255,255,255,0.08))] bg-[var(--v2-surface,rgba(255,255,255,0.02))]',
                      'hover:border-[var(--v2-gold,#d4af37)]/35 transition-colors duration-200',
                      'backdrop-blur-sm overflow-hidden'
                    )}
                  >
                    <div
                      className="aspect-[16/10] bg-gradient-to-br from-[var(--v2-gold,#d4af37)]/10 via-black/40 to-black/70 border-b border-[var(--v2-border,rgba(255,255,255,0.06))] p-4 flex flex-col justify-end"
                      style={{
                        backgroundImage: example.storyboardPreview[0]
                          ? `linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2)), url(${example.storyboardPreview[0]})`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          'w-fit mb-2 border-[var(--v2-gold,#d4af37)]/30 bg-black/50',
                          'text-[8px] tracking-[0.18em] uppercase text-[var(--v2-gold,#d4af37)]'
                        )}
                      >
                        {proofNicheLabel(example.niche)}
                      </Badge>
                      <p className="text-[10px] text-white/50 line-clamp-1">{example.thumbnailIdea}</p>
                    </div>
                    <CardContent className="p-4 space-y-2.5">
                      <h3 className="font-display text-sm sm:text-[15px] text-[var(--v2-text-primary,#F4E7C1)] leading-snug line-clamp-2 group-hover:text-[var(--v2-gold,#d4af37)] transition-colors">
                        {example.topic}
                      </h3>
                      <p className="text-xs text-[var(--v2-text-secondary,rgba(244,231,193,0.65))] italic line-clamp-2">
                        &ldquo;{example.hook}&rdquo;
                      </p>
                      <p className="text-[11px] text-[var(--v2-text-secondary,rgba(244,231,193,0.45))] line-clamp-2 leading-relaxed">
                        {example.scriptPreview}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.14em] uppercase text-[var(--v2-text-secondary,rgba(244,231,193,0.5))] group-hover:text-[var(--v2-gold,#d4af37)] transition-colors pt-1">
                        Preview full output <ArrowRight className="w-3 h-3" />
                      </span>
                    </CardContent>
                  </Card>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ExamplePreviewModal
        example={selected}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
