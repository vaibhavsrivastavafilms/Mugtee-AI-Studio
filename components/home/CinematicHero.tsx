'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, Sparkles } from 'lucide-react'
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

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault()
    persistModeEntry('quick')
    if (!ready) return
    router.push(user ? STUDIO_QUICK : authLoginHref('quick'))
  }

  return (
    <section className={cn('relative shrink-0 text-center px-4 pt-3 pb-2 sm:pt-4', className)}>
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        aria-hidden
      >
        <div className="absolute left-0 top-1/2 h-32 w-32 -translate-y-1/2 bg-[radial-gradient(circle,rgba(212,175,55,0.12),transparent_70%)]" />
        <div className="absolute right-0 top-1/3 h-40 w-40 bg-[radial-gradient(circle,rgba(212,175,55,0.08),transparent_70%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 mb-2"
      >
        <span className="text-[9px] tracking-[0.28em] uppercase text-[#E8C547]">
          Your Cinematic AI Studio
        </span>
        <Sparkles className="w-3 h-3 text-[#D4AF37]" aria-hidden />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.05 }}
        className="font-display text-2xl sm:text-3xl lg:text-[2.35rem] leading-tight text-[#D4AF37] italic"
      >
        Direct Cinematic Stories with AI
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.12 }}
        className="mt-1.5 max-w-xl mx-auto text-xs sm:text-sm text-white/55"
      >
        From idea to cinematic reel. Two powerful modes. One seamless studio.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.18 }}
        className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
      >
        <button type="button" onClick={handleStart} className={cn(goldButton, 'px-5 py-2.5')}>
          Start Creating Now
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
