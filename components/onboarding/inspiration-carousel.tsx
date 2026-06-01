'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { POPULAR_CREATOR_IDEAS } from '@/lib/activation/first-activation'
import { markHasCreatedProject } from '@/lib/onboarding/onboarding-state'

type InspirationCarouselProps = {
  onSelect: (topic: string) => void
  className?: string
}

export function InspirationCarousel({ onSelect, className }: InspirationCarouselProps) {
  const handleSelect = (topic: string) => {
    markHasCreatedProject()
    onSelect(topic)
  }

  return (
    <section className={cn('space-y-3', className)} aria-label="Popular creator ideas">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">
            Popular Creator Ideas
          </p>
          <p className="mt-1 text-xs text-luxe/50">Scroll — tap any card to import instantly</p>
        </div>
      </div>

      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-2 -mx-1 px-1',
          'snap-x snap-mandatory scroll-smooth',
          '[scrollbar-width:thin] scrollbar-thumb-gold-500/20'
        )}
      >
        {POPULAR_CREATOR_IDEAS.map((idea, index) => (
          <motion.button
            key={idea.id}
            type="button"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04, duration: 0.28 }}
            onClick={() => handleSelect(idea.topic)}
            className={cn(
              'snap-start shrink-0 w-[72vw] max-w-[240px] sm:w-[220px]',
              'rounded-2xl border border-white/[0.08] bg-black/35 overflow-hidden text-left',
              'hover:border-gold-500/30 transition-colors group'
            )}
          >
            <div className="relative aspect-[4/5]">
              <Image
                src={idea.imageUrl}
                alt={idea.title}
                fill
                sizes="240px"
                className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/55 text-[9px] tracking-[0.18em] uppercase text-gold-300/90">
                {idea.category}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-3 space-y-1">
                <p className="font-display text-sm text-[#F4E7C1] leading-snug">{idea.title}</p>
                <p className="text-[10px] text-luxe/55 italic line-clamp-2">&ldquo;{idea.hook}&rdquo;</p>
                <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.14em] uppercase text-gold-300/75 pt-1">
                  Import idea
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  )
}
