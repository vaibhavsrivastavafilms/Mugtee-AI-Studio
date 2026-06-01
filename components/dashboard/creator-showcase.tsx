'use client'

import { useId, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, Sparkles, Wand2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  filterShowcaseByCategory,
  proofNicheLabel,
  SHOWCASE_FEATURED_CATEGORIES,
  SHOWCASE_INSPIRATION_FEED,
  type ProofShowcaseExample,
  type ShowcaseCategoryId,
} from '@/lib/proof/showcase-examples'
import { activationTopicHref } from '@/lib/activation/first-activation'
import { ExamplePreviewModal } from '@/components/proof/example-preview-modal'

const TYPE_LABELS = {
  hook: 'Hook',
  script: 'Script',
  visual: 'Visual direction',
} as const

export function CreatorShowcase({ className }: { className?: string }) {
  const [category, setCategory] = useState<ShowcaseCategoryId>('all')
  const [preview, setPreview] = useState<ProofShowcaseExample | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const tabPanelId = useId()

  const items = useMemo(() => filterShowcaseByCategory(category).slice(0, 6), [category])

  const openPreview = (example: ProofShowcaseExample) => {
    setPreview(example)
    setModalOpen(true)
  }

  return (
    <>
      <section className={cn('space-y-5', className)} aria-label="Creator showcase">
        <div className="text-center sm:text-left">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 mb-2">
            Explore Examples
          </div>
          <h2 className="font-display text-xl sm:text-2xl text-luxe">
            Stories that <span className="text-gold-gradient">feel filmed</span>
          </h2>
          <p className="mt-1 text-sm text-luxe/50">
            Featured creations by category — view, remix, or generate in one tap.
          </p>
        </div>

        <div
          className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5"
          role="tablist"
          aria-label="Showcase categories"
        >
          {SHOWCASE_FEATURED_CATEGORIES.map((cat) => {
            const selected = category === cat.id
            const tabId = `showcase-tab-${cat.id}`
            const tabClassName = cn(
              'shrink-0 min-h-[36px] rounded-full px-3.5 py-1.5 text-[10px] tracking-[0.14em] uppercase transition-colors',
              selected
                ? 'bg-gold-500/15 border border-gold-500/35 text-gold-100'
                : 'border border-white/[0.08] text-luxe/45 hover:text-luxe/70 hover:border-white/15'
            )
            return selected ? (
              <button
                key={cat.id}
                type="button"
                id={tabId}
                role="tab"
                aria-selected="true"
                aria-controls={tabPanelId}
                tabIndex={0}
                onClick={() => setCategory(cat.id)}
                className={tabClassName}
              >
                {cat.label}
              </button>
            ) : (
              <button
                key={cat.id}
                type="button"
                id={tabId}
                role="tab"
                aria-selected="false"
                aria-controls={tabPanelId}
                tabIndex={-1}
                onClick={() => setCategory(cat.id)}
                className={tabClassName}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        <div
          role="tabpanel"
          id={tabPanelId}
          aria-labelledby={`showcase-tab-${category}`}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {items.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-black/30 hover:border-gold-500/25 transition-colors flex flex-col"
            >
              <div className="relative aspect-[3/4]">
                {item.storyboardPreview[0] ? (
                  <Image
                    src={item.storyboardPreview[0]}
                    alt={item.topic}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    unoptimized
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm text-[9px] tracking-[0.22em] uppercase text-gold-300/90">
                  {proofNicheLabel(item.niche)}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
                  <h3 className="font-display text-base text-[#F4E7C1]">{item.topic}</h3>
                  <p className="text-xs text-luxe/55 italic line-clamp-2">&ldquo;{item.hook}&rdquo;</p>
                </div>
              </div>

              <div className="p-3 pt-2 grid grid-cols-3 gap-1.5 mt-auto">
                <button
                  type="button"
                  aria-label={`View ${item.topic}`}
                  onClick={() => openPreview(item)}
                  className={cn(
                    'inline-flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-lg',
                    'border border-white/[0.08] text-[9px] tracking-[0.1em] uppercase text-luxe/55',
                    'hover:text-gold-200 hover:border-gold-500/25 transition-colors'
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <Link
                  href={activationTopicHref(item.topic)}
                  className={cn(
                    'inline-flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-lg',
                    'border border-white/[0.08] text-[9px] tracking-[0.1em] uppercase text-luxe/55',
                    'hover:text-gold-200 hover:border-gold-500/25 transition-colors'
                  )}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Remix
                </Link>
                <Link
                  href={activationTopicHref(item.topic, true)}
                  className={cn(
                    'inline-flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-lg',
                    'border border-gold-500/25 bg-gold-500/[0.08] text-[9px] tracking-[0.1em] uppercase text-gold-200/90',
                    'hover:bg-gold-500/12 hover:border-gold-500/40 transition-colors'
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Generate
                </Link>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-gold-400/70" />
            <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/80">
              Inspiration feed
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-1 px-1 pb-1">
            {SHOWCASE_INSPIRATION_FEED.map((entry) => (
              <Link
                key={entry.id}
                href={activationTopicHref(entry.topic)}
                className={cn(
                  'snap-start shrink-0 w-[min(280px,78vw)] rounded-xl border border-white/[0.06] bg-black/25 p-3',
                  'hover:border-gold-500/25 transition-colors'
                )}
              >
                <span className="text-[8px] tracking-[0.18em] uppercase text-gold-300/70">
                  {TYPE_LABELS[entry.type]} · {proofNicheLabel(entry.niche)}
                </span>
                <p className="mt-1.5 text-[11px] text-luxe/65 leading-relaxed line-clamp-3">
                  {entry.label}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[9px] tracking-[0.12em] uppercase text-gold-300/60">
                  Use idea
                  <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ExamplePreviewModal example={preview} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
