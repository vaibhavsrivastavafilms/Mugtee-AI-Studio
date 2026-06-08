'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, Sparkles } from 'lucide-react'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import {
  ghostButton,
  goldButton,
  STUDIO_ENTRY,
  WATCH_DEMO_HREF,
} from '@/components/home/cinematic-home-styles'

type CinematicHeroProps = {
  className?: string
}

export function CinematicHero({ className }: CinematicHeroProps) {
  const router = useRouter()
  const fadeUpH1 = useCinematicMotionInitial({ opacity: 0, y: 10 })
  const fadeIn = useCinematicMotionInitial({ opacity: 0 })
  const fadeUp = useCinematicMotionInitial({ opacity: 0, y: 8 })

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push(STUDIO_ENTRY)
  }

  return (
    <section className={cn('relative shrink-0 text-center px-4 pt-10 pb-6 sm:pt-14 sm:pb-8', className)}>
      <motion.h1
        initial={fadeUpH1}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65 }}
        className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] leading-tight text-white"
      >
        <span className="block text-[10px] sm:text-xs tracking-[0.35em] uppercase text-[#D4AF37]/80 mb-2 font-sans font-medium not-italic">
          MUGTEE
        </span>
        The Creator{' '}
        <span className="text-[#D4AF37] italic">Operating System</span>
      </motion.h1>

      <motion.p
        initial={fadeIn}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.08 }}
        className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-white/60 leading-relaxed px-1"
      >
        Turn one idea into a complete reel.
      </motion.p>
      <motion.div
        initial={fadeIn}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs sm:text-sm text-white/45"
        role="list"
        aria-label="Pipeline outputs"
      >
        {['Script', 'Storyboard', 'Voice', 'Motion', 'MP4'].map((item) => (
          <span key={item} role="listitem" className="inline-flex items-center gap-1">
            <span className="text-emerald-400/80" aria-hidden>
              ✓
            </span>{' '}
            {item}
          </span>
        ))}
      </motion.div>

      <motion.div
        initial={fadeUp}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.14 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
      >
        <button type="button" onClick={handleStart} className={cn(goldButton, 'px-6 py-2.5')}>
          Start Creating
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
        </button>
        <Link href={WATCH_DEMO_HREF} className={cn(ghostButton, 'px-6 py-2.5')}>
          Watch Demo
          <Play className="w-3.5 h-3.5 fill-current" aria-hidden />
        </Link>
      </motion.div>
    </section>
  )
}
