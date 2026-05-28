'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Captions,
  Download,
  Lightbulb,
  Megaphone,
  PanelsTopLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FRAMES = [
  {
    id: 'idea',
    label: 'Idea Input',
    caption: 'Drop a concept — Mugtee shapes the narrative spine.',
    icon: Lightbulb,
    gradient: 'from-amber-900/40 via-gold-500/20 to-transparent',
  },
  {
    id: 'hook',
    label: 'Hook Generation',
    caption: 'Retention-first opening beat, tuned for Shorts & reels.',
    icon: Megaphone,
    gradient: 'from-orange-900/35 via-amber-600/15 to-transparent',
  },
  {
    id: 'storyboard',
    label: 'Storyboard Creation',
    caption: 'Auto scene grid with cinematic framing cues.',
    icon: PanelsTopLeft,
    gradient: 'from-yellow-900/30 via-gold-500/12 to-transparent',
  },
  {
    id: 'voice',
    label: 'Captions + Voice',
    caption: 'Narration, pacing, and on-screen captions synced.',
    icon: Captions,
    gradient: 'from-amber-800/35 via-gold-400/10 to-transparent',
  },
  {
    id: 'export',
    label: 'Export Reel',
    caption: 'Platform-ready reel — download or publish.',
    icon: Download,
    gradient: 'from-gold-900/40 via-amber-500/15 to-transparent',
  },
] as const

const INTERVAL_MS = 3800

export function QuickCutCarousel() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(
      () => setActive((i) => (i + 1) % FRAMES.length),
      INTERVAL_MS
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative w-full max-w-3xl overflow-hidden">
      <div className="absolute -inset-4 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div
        className={cn(
          'relative flex gap-4 overflow-x-auto scroll-touch snap-x snap-mandatory pb-2',
          'lg:overflow-hidden lg:pb-0 lg:min-h-[200px]'
        )}
      >
        {FRAMES.map((frame, index) => {
          const Icon = frame.icon
          const isActive = active === index
          return (
            <motion.div
              key={frame.id}
              className={cn(
                'relative shrink-0 snap-center w-[78%] sm:w-[62%] lg:w-full',
                'rounded-2xl border overflow-hidden',
                'lg:absolute lg:inset-0 lg:w-full',
                isActive
                  ? 'border-gold-500/35 shadow-[0_0_40px_rgba(212,175,55,0.18)] z-10'
                  : 'border-white/[0.06] opacity-75 lg:opacity-0 lg:pointer-events-none lg:z-0'
              )}
              animate={
                typeof window !== 'undefined' && window.innerWidth >= 1024
                  ? {
                      opacity: isActive ? 1 : 0,
                      scale: isActive ? 1 : 0.96,
                      y: isActive ? 0 : 8,
                    }
                  : undefined
              }
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br',
                  frame.gradient
                )}
              />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_100%,rgba(212,175,55,0.18)_0%,transparent_65%)]" />
              <motion.div
                className="absolute inset-0 shimmer-cinematic opacity-30 pointer-events-none"
                animate={isActive ? { opacity: [0.15, 0.35, 0.15] } : undefined}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              <div className="relative z-[1] p-5 sm:p-6 min-h-[160px] sm:min-h-[180px] flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <motion.div
                    className="flex items-center gap-2.5"
                    animate={isActive ? { y: [0, -2, 0] } : undefined}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/15 border border-gold-500/25 shadow-[0_0_20px_rgba(212,175,55,0.12)]">
                      <Icon className="h-4 w-4 text-gold-300" />
                    </div>
                    <span className="text-[10px] tracking-[0.28em] uppercase text-gold-300/90">
                      {frame.label}
                    </span>
                  </motion.div>
                  <span className="text-[10px] text-luxe/35 tabular-nums">
                    {String(index + 1).padStart(2, '0')} / {FRAMES.length}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {isActive ? (
                    <motion.p
                      key={frame.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className="text-sm sm:text-base text-luxe/70 leading-relaxed mt-4 text-left"
                    >
                      {frame.caption}
                    </motion.p>
                  ) : null}
                </AnimatePresence>

                <div className="mt-5 flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full',
                        i <= index ? 'bg-gold-500/30' : 'bg-white/[0.06]'
                      )}
                      animate={
                        isActive && i === index
                          ? { opacity: [0.5, 1, 0.5] }
                          : undefined
                      }
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="flex justify-center gap-1.5 mt-4">
        {FRAMES.map((frame, i) => (
          <button
            key={frame.id}
            type="button"
            aria-label={`Show ${frame.label}`}
            onClick={() => setActive(i)}
            className={cn(
              'h-1 rounded-full transition-all duration-500',
              active === i ? 'w-7 bg-gold-400' : 'w-2 bg-white/15 hover:bg-white/25'
            )}
          />
        ))}
      </div>
    </div>
  )
}
