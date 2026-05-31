'use client'

import { motion } from 'framer-motion'
import {
  Building2,
  Clapperboard,
  Film,
  Mic2,
  UserCircle,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const AUDIENCES: { label: string; icon: LucideIcon }[] = [
  { label: 'YouTubers', icon: Video },
  { label: 'Faceless Creators', icon: Mic2 },
  { label: 'Storytellers', icon: Clapperboard },
  { label: 'Documentary Creators', icon: Film },
  { label: 'Personal Brands', icon: UserCircle },
  { label: 'Agencies', icon: Building2 },
]

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
}

export function CreatorAudienceSection({ className }: { className?: string }) {
  return (
    <section
      className={cn('relative px-5 sm:px-6 py-12 sm:py-16', className)}
      aria-labelledby="creator-audience-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div {...fadeUp} className="text-center mb-8 sm:mb-10 max-w-xl mx-auto">
          <p className="text-[10px] tracking-[0.32em] uppercase text-[var(--v2-gold)] mb-3">
            Built for creators
          </p>
          <h2
            id="creator-audience-heading"
            className="font-display text-2xl sm:text-3xl text-[var(--v2-text-primary)]"
          >
            Who Mugtee is for
          </h2>
          <p className="mt-2 text-sm text-[var(--v2-text-secondary)]">
            From solo creators to teams shipping content at scale.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.06 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {AUDIENCES.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.label}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.04 }}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-xl border border-[var(--v2-border)]',
                  'bg-[var(--v2-surface)]/60 px-3 py-5 text-center',
                  'hover:border-[var(--v2-gold)]/35 transition-colors duration-200'
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full',
                    'border border-[var(--v2-gold)]/25 bg-[var(--v2-gold)]/5'
                  )}
                >
                  <Icon className="h-5 w-5 text-[var(--v2-gold)]" aria-hidden />
                </span>
                <span className="text-xs sm:text-sm font-medium text-[var(--v2-text-primary)] leading-tight">
                  {item.label}
                </span>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
