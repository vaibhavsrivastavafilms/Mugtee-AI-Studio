'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Captions,
  FileText,
  ImageIcon,
  LayoutGrid,
  Lightbulb,
  Megaphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SHOWCASE_EXAMPLES } from '@/lib/proof/showcase-examples'

const DEMO_EXAMPLE = SHOWCASE_EXAMPLES[0]

const PIPELINE_STEPS = [
  { key: 'idea', label: 'Idea', icon: Lightbulb, value: DEMO_EXAMPLE.topic },
  { key: 'hook', label: 'Hook', icon: Megaphone, value: DEMO_EXAMPLE.hook },
  { key: 'script', label: 'Script', icon: FileText, value: DEMO_EXAMPLE.scriptPreview },
  { key: 'storyboard', label: 'Storyboard', icon: LayoutGrid, value: null },
  { key: 'caption', label: 'Caption', icon: Captions, value: DEMO_EXAMPLE.captionPreview },
  {
    key: 'thumbnail',
    label: 'Thumbnail Concept',
    icon: ImageIcon,
    value: DEMO_EXAMPLE.thumbnailIdea,
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

export function ProductDemoFlow({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 py-12 sm:py-16 border-b border-[var(--v2-border)]',
        className
      )}
      aria-labelledby="product-demo-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[0.32em] uppercase text-[var(--v2-gold)] mb-3">
            One idea, full package
          </p>
          <h2
            id="product-demo-heading"
            className="font-display text-2xl sm:text-3xl text-[var(--v2-text-primary)]"
          >
            Idea to export-ready content
          </h2>
          <p className="mt-2 text-sm text-[var(--v2-text-secondary)]">
            Example output from &ldquo;{DEMO_EXAMPLE.topic}&rdquo; — illustrative, no login required.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mb-8"
        >
          {PIPELINE_STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.key} className="flex items-center gap-1 sm:gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                    'border border-[var(--v2-border)] bg-[var(--v2-surface)]',
                    'text-[10px] sm:text-xs tracking-wide text-[var(--v2-text-secondary)]'
                  )}
                >
                  <Icon className="h-3 w-3 text-[var(--v2-gold)]/80 shrink-0" aria-hidden />
                  {step.label}
                </span>
                {index < PIPELINE_STEPS.length - 1 ? (
                  <ArrowRight
                    className="h-3 w-3 text-[var(--v2-gold)]/40 shrink-0 hidden sm:block"
                    aria-hidden
                  />
                ) : null}
              </div>
            )
          })}
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.08 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
        >
          {PIPELINE_STEPS.filter((s) => s.key !== 'storyboard').map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.key}
                className={cn(
                  'rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)]/80 p-4',
                  step.key === 'thumbnail' && 'md:col-span-2 lg:col-span-1'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-[var(--v2-gold)]/70" aria-hidden />
                  <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--v2-gold)]">
                    {step.label}
                  </span>
                </div>
                <p className="text-sm text-[var(--v2-text-primary)] leading-relaxed line-clamp-4">
                  {step.value}
                </p>
              </div>
            )
          })}

          <div
            className={cn(
              'rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)]/80 p-4',
              'md:col-span-2 lg:col-span-2'
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="h-4 w-4 text-[var(--v2-gold)]/70" aria-hidden />
              <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--v2-gold)]">
                Storyboard
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_EXAMPLE.storyboardPreview.map((src, i) => (
                <div
                  key={src}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden border border-[var(--v2-border)]"
                >
                  <Image
                    src={src}
                    alt={`Storyboard frame ${i + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
