'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  markWelcomeShownToday,
  shouldShowWelcomeBack,
} from '@/lib/retention/returning-creator-state'

type WelcomeBackBannerProps = {
  className?: string
}

export function WelcomeBackBanner({ className }: WelcomeBackBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (shouldShowWelcomeBack()) {
      setVisible(true)
      markWelcomeShownToday()
    }
  }, [])

  if (!visible) return null

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className={cn(
            'relative rounded-2xl border border-gold-500/25 bg-gold-500/[0.06] backdrop-blur-sm',
            'px-4 py-3.5 sm:px-5 sm:py-4',
            className
          )}
          role="status"
        >
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="absolute top-3 right-3 p-1 rounded-lg text-luxe/40 hover:text-luxe/70 hover:bg-white/5 transition"
            aria-label="Dismiss welcome"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-300">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-display text-base sm:text-lg text-[#F4E7C1]">Welcome back.</p>
              <p className="text-xs sm:text-sm text-luxe/55 mt-0.5">
                Ready to create something new today?
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
