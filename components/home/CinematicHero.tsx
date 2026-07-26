'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import {
  ghostButton,
  goldButton,
  STUDIO_ENTRY,
} from '@/components/home/cinematic-home-styles'
import { MugteeCompanionCharacter } from '@/components/home/MugteeCompanionCharacter'

type CinematicHeroProps = {
  className?: string
}

export function CinematicHero({ className }: CinematicHeroProps) {
  const router = useRouter()
  const fadeUpH1 = useCinematicMotionInitial({ opacity: 0, y: 10 })
  const fadeIn = useCinematicMotionInitial({ opacity: 0 })
  const fadeUp = useCinematicMotionInitial({ opacity: 0, y: 8 })

  return (
    <section
      className={cn(
        'relative overflow-hidden px-4 pt-16 pb-14 text-center sm:pt-24 sm:pb-16',
        className
      )}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-8 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-[#D4AF37]/[0.12] blur-3xl"
        aria-hidden
      />
      <motion.div
        initial={fadeUp}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="opacity-90"
      >
        <MugteeCompanionCharacter size="sm" mood="hello" />
      </motion.div>

      <motion.h1
        initial={fadeUpH1}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65 }}
        className="mx-auto mt-6 max-w-4xl font-display text-5xl leading-[0.98] text-white sm:text-6xl lg:text-[5.25rem]"
      >
        Your story. Finished as film.
      </motion.h1>

      <motion.p
        initial={fadeIn}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.08 }}
        className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#B8B8B8] sm:text-lg"
      >
        Mugtee turns an idea into a cinematic reel.
      </motion.p>

      <motion.div
        initial={fadeUp}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.14 }}
        className="mt-9 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          type="button"
          onClick={() => router.push(STUDIO_ENTRY)}
          className={cn(goldButton, 'min-h-12 px-7 py-3')}
        >
          Start creating
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        <Link href="#watch" className={cn(ghostButton, 'min-h-12 px-6 py-3')}>
          Watch Mugtee create
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
        </Link>
      </motion.div>
    </section>
  )
}
