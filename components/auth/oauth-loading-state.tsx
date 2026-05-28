'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type OAuthLoadingStateProps = {
  message?: string
  className?: string
}

export function OAuthLoadingState({
  message = 'Preparing your cinematic reel studio…',
  className,
}: OAuthLoadingStateProps) {
  return (
    <div
      className={cn(
        'min-h-screen w-full flex items-center justify-center bg-[#050505] px-6 relative overflow-hidden',
        className
      )}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-noir-radial opacity-80" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-gold-500/[0.08] blur-3xl"
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/4 w-[280px] h-[280px] rounded-full bg-amber-600/[0.06] blur-2xl"
          animate={{ opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md text-center space-y-6"
      >
        <div className="relative mx-auto w-20 h-20">
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gold-gradient opacity-30 blur-xl"
            animate={{ opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <div className="relative w-full h-full rounded-2xl border border-gold-500/30 bg-black/60 overflow-hidden shadow-gold-glow">
            <div className="absolute inset-0 shimmer-cinematic opacity-50" />
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-md bg-gold-500/10 border border-gold-500/15"
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    delay: i * 0.25,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <motion.p
            className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.8, repeat: Infinity }}
          >
            Quick Cut
          </motion.p>
          <p className="font-display text-xl sm:text-2xl text-luxe leading-snug">{message}</p>
        </div>

        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1 w-8 rounded-full bg-gold-500/30"
              animate={{ opacity: [0.25, 0.9, 0.25], scaleX: [0.6, 1, 0.6] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                delay: i * 0.35,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
