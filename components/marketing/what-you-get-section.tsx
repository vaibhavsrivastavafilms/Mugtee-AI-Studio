'use client'

import { motion } from 'framer-motion'
import {
  Captions,
  FileText,
  ImageIcon,
  LayoutGrid,
  Megaphone,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SHOWCASE_EXAMPLES } from '@/lib/proof/showcase-examples'

const nokia = SHOWCASE_EXAMPLES[0]
const aiWork = SHOWCASE_EXAMPLES[1]
const apple = SHOWCASE_EXAMPLES[2]

const OFFERINGS: {
  title: string
  icon: LucideIcon
  snippet: string
}[] = [
  {
    title: 'Hook Generator',
    icon: Megaphone,
    snippet: nokia.hook,
  },
  {
    title: 'Script Writer',
    icon: FileText,
    snippet: nokia.scriptPreview,
  },
  {
    title: 'Storyboard Creator',
    icon: LayoutGrid,
    snippet: `3 cinematic frames — ${nokia.topic}`,
  },
  {
    title: 'Caption Generator',
    icon: Captions,
    snippet: aiWork.captionPreview,
  },
  {
    title: 'Thumbnail Ideation',
    icon: ImageIcon,
    snippet: apple.thumbnailIdea,
  },
]

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

export function WhatYouGetSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 py-12 sm:py-16 border-y border-[var(--v2-border)]',
        className
      )}
      aria-labelledby="what-you-get-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.32em] uppercase text-[var(--v2-gold)] mb-3">
            What you get
          </p>
          <h2
            id="what-you-get-heading"
            className="font-display text-2xl sm:text-3xl text-[var(--v2-text-primary)]"
          >
            Everything you need to ship a reel
          </h2>
          <p className="mt-2 text-sm text-[var(--v2-text-secondary)]">
            Real output shapes from Mugtee showcase examples — not generic placeholders.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {OFFERINGS.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                className={cn(
                  'rounded-xl border border-[var(--v2-border)] bg-[var(--v2-bg)]/60 p-5',
                  'hover:border-[var(--v2-gold)]/30 transition-colors duration-200',
                  index === OFFERINGS.length - 1 && 'sm:col-span-2 lg:col-span-1'
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-[var(--v2-gold)]" aria-hidden />
                  <h3 className="text-sm font-medium text-[var(--v2-text-primary)]">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[var(--v2-text-secondary)] leading-relaxed line-clamp-4">
                  {item.snippet}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
