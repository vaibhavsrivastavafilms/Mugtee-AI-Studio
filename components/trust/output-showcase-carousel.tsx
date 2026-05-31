'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SHOWCASE_EXAMPLES, proofNicheLabel } from '@/lib/proof/showcase-examples'

const ROTATE_MS = 6000

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

export function OutputShowcaseCarousel({ className }: { className?: string }) {
  const [index, setIndex] = useState(0)
  const example = SHOWCASE_EXAMPLES[index]

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % SHOWCASE_EXAMPLES.length)
  }, [])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + SHOWCASE_EXAMPLES.length) % SHOWCASE_EXAMPLES.length)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(goNext, ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [goNext])

  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 py-12 sm:py-16 border-b border-[var(--v2-border,rgba(255,255,255,0.06))]',
        className
      )}
      aria-labelledby="output-carousel-heading"
      aria-live="polite"
    >
      <div className="mx-auto max-w-4xl">
        <motion.div {...fadeUp} className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--v2-gold,#d4af37)]/5 border border-[var(--v2-gold,#d4af37)]/25 text-[10px] tracking-[0.28em] uppercase text-[var(--v2-gold,#d4af37)] mb-4">
            <Sparkles className="w-3 h-3" aria-hidden />
            Live preview
          </div>
          <h2
            id="output-carousel-heading"
            className="font-display text-2xl sm:text-3xl text-[var(--v2-text-primary,#F4E7C1)]"
          >
            Output in motion
          </h2>
          <p className="mt-2 text-sm text-[var(--v2-text-secondary,rgba(244,231,193,0.6))]">
            Rotating showcase examples — illustrative outputs, no login required.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          className={cn(
            'relative rounded-2xl border border-[var(--v2-border,rgba(255,255,255,0.1))]',
            'bg-[var(--v2-surface,rgba(255,255,255,0.02))] overflow-hidden',
            'shadow-[0_0_40px_rgba(212,175,55,0.06)]'
          )}
        >
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: example.storyboardPreview[0]
                ? `url(${example.storyboardPreview[0]})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/90 to-black/80" aria-hidden />

          <div className="relative p-6 sm:p-8 min-h-[280px] sm:min-h-[300px] flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <Badge
                  variant="outline"
                  className="mb-2 border-[var(--v2-gold,#d4af37)]/30 text-[9px] tracking-[0.16em] uppercase text-[var(--v2-gold,#d4af37)]"
                >
                  {proofNicheLabel(example.niche)} · Example
                </Badge>
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={example.id + '-topic'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="font-display text-xl sm:text-2xl text-[var(--v2-text-primary,#F4E7C1)]"
                  >
                    {example.topic}
                  </motion.h3>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={goPrev}
                  className="p-2 rounded-lg border border-[var(--v2-border,rgba(255,255,255,0.1))] text-[var(--v2-text-secondary,rgba(244,231,193,0.6))] hover:text-[var(--v2-gold,#d4af37)] hover:border-[var(--v2-gold,#d4af37)]/30 transition-colors"
                  aria-label="Previous example"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="p-2 rounded-lg border border-[var(--v2-border,rgba(255,255,255,0.1))] text-[var(--v2-text-secondary,rgba(244,231,193,0.6))] hover:text-[var(--v2-gold,#d4af37)] hover:border-[var(--v2-gold,#d4af37)]/30 transition-colors"
                  aria-label="Next example"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={example.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.35 }}
                className="space-y-4 flex-1"
              >
                <div>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--v2-gold,#d4af37)]/70 mb-1.5">
                    Hook
                  </p>
                  <p className="text-sm sm:text-base text-[var(--v2-text-primary,#F4E7C1)] italic leading-relaxed">
                    &ldquo;{example.hook}&rdquo;
                  </p>
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--v2-gold,#d4af37)]/70 mb-1.5">
                    Script snippet
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--v2-text-secondary,rgba(244,231,193,0.75))] leading-relaxed line-clamp-3">
                    {example.scriptPreview}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.2em] uppercase text-[var(--v2-gold,#d4af37)]/70 mb-1.5">
                    Caption snippet
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--v2-text-secondary,rgba(244,231,193,0.65))] leading-relaxed line-clamp-2">
                    {example.captionPreview}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-1.5 mt-6 pt-4 border-t border-[var(--v2-border,rgba(255,255,255,0.06))]">
              {SHOWCASE_EXAMPLES.map((ex, i) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === index
                      ? 'w-6 bg-[var(--v2-gold,#d4af37)]'
                      : 'w-1.5 bg-[var(--v2-text-secondary,rgba(244,231,193,0.25))] hover:bg-[var(--v2-gold,#d4af37)]/50'
                  )}
                  aria-label={`Show example: ${ex.topic}`}
                  aria-current={i === index ? 'true' : undefined}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
