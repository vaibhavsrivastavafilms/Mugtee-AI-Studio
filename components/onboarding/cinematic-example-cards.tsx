'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CINEMATIC_HERO_EXAMPLES } from '@/lib/activation/first-activation'
import { markHasCreatedProject } from '@/lib/onboarding/onboarding-state'

type CinematicExampleCardsProps = {
  onSelect: (prompt: string, options?: { launch?: boolean }) => void
  className?: string
}

export function CinematicExampleCards({ onSelect, className }: CinematicExampleCardsProps) {
  const handleSelect = (prompt: string, launch?: boolean) => {
    markHasCreatedProject()
    onSelect(prompt, { launch })
  }

  return (
    <section className={cn('space-y-3', className)} aria-label="Cinematic examples">
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-gold-300/80" aria-hidden />
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">
          Start with a cinematic example
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CINEMATIC_HERO_EXAMPLES.map((example, index) => (
          <motion.button
            key={example.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            onClick={() => handleSelect(example.prompt, true)}
            className={cn(
              'group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 text-left',
              'hover:border-gold-500/35 hover:shadow-[0_8px_32px_-8px_rgba(212,175,55,0.2)] transition-all',
              'min-h-[120px] sm:min-h-[160px]'
            )}
          >
            <div className="absolute inset-0">
              <Image
                src={example.imageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover opacity-40 group-hover:opacity-50 group-hover:scale-[1.03] transition-all duration-500"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
            </div>

            <div className="relative p-4 flex flex-col justify-end h-full min-h-[120px] sm:min-h-[160px]">
              <p className="font-display text-sm sm:text-base text-[#F4E7C1] leading-snug">
                {example.label}
              </p>
              <p className="mt-1.5 text-[11px] text-luxe/55 italic line-clamp-2 leading-relaxed">
                &ldquo;{example.hook}&rdquo;
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] tracking-[0.16em] uppercase text-gold-300/80 group-hover:text-gold-200">
                Use this idea
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  )
}
