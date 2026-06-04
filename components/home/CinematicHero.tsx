'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, Sparkles } from 'lucide-react'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { useRouter } from 'next/navigation'
import { authLoginHref, persistModeEntry } from '@/lib/create/mode-selection'
import {
  ghostButton,
  goldButton,
  STUDIO_QUICK,
  WATCH_DEMO_HREF,
} from '@/components/home/cinematic-home-styles'

type CinematicHeroProps = {
  className?: string
}

export function CinematicHero({ className }: CinematicHeroProps) {
  const router = useRouter()
  const { ready, user } = useAuthHydration()
  const fadeUpH1 = useCinematicMotionInitial({ opacity: 0, y: 10 })
  const fadeIn = useCinematicMotionInitial({ opacity: 0 })
  const fadeUp = useCinematicMotionInitial({ opacity: 0, y: 8 })

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault()
    persistModeEntry('quick')
    if (!ready) return
    router.push(user ? STUDIO_QUICK : authLoginHref('quick'))
  }

  return (
    <section
      id="watch-demo"
      className={cn('relative shrink-0 text-center px-4 pt-4 pb-3 sm:pt-5 sm:pb-4', className)}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-35 bg-cover bg-center"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.92) 70%), radial-gradient(ellipse 90% 60% at 50% 20%, rgba(30,25,18,0.9), #050505)',
          }}
        />
        <div className="absolute left-1/4 top-1/3 h-40 w-56 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.08),transparent_70%)] blur-2xl" />
        <div className="absolute right-1/4 top-1/4 h-32 w-48 rounded-full bg-[radial-gradient(circle,rgba(80,60,30,0.12),transparent_70%)] blur-xl" />
      </div>

      <motion.h1
        initial={fadeUpH1}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65 }}
        className="font-display text-2xl sm:text-3xl lg:text-[2.5rem] leading-tight text-white"
      >
        Direct Cinematic Stories With{' '}
        <span className="text-[#D4AF37] italic">AI</span>
      </motion.h1>

      <motion.p
        initial={fadeIn}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.08 }}
        className="mt-2 max-w-lg mx-auto text-xs sm:text-sm text-white/55"
      >
        From idea to cinematic reel. Choose your workflow.
      </motion.p>

      <motion.div
        initial={fadeUp}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.14 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
      >
        <button type="button" onClick={handleStart} className={cn(goldButton, 'px-5 py-2.5')}>
          Start Creating
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
        </button>
        <Link href={WATCH_DEMO_HREF} className={cn(ghostButton, 'px-5 py-2.5')}>
          Watch Demo
          <Play className="w-3.5 h-3.5 fill-current" aria-hidden />
        </Link>
      </motion.div>
    </section>
  )
}
