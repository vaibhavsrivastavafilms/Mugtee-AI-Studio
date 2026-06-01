'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  hasCompletedFirstGeneration,
  markFirstGeneration,
} from '@/lib/onboarding/onboarding-state'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type FirstSuccessCelebrationProps = {
  className?: string
}

export function FirstSuccessCelebration({ className }: FirstSuccessCelebrationProps) {
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const [visible, setVisible] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!isComplete || hasCompletedFirstGeneration()) return
    markFirstGeneration()
    setVisible(true)
    const t = window.setTimeout(() => setRevealed(true), 400)
    return () => window.clearTimeout(t)
  }, [isComplete])

  if (!visible) return null

  const headline = title?.trim() || hook?.trim() || 'Your story'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-gold-500/20',
        'bg-gradient-to-b from-black/60 via-[#0a0a0a] to-black/80 p-6 sm:p-8',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_60%)]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.98 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative text-center space-y-3"
      >
        <Sparkles className="h-5 w-5 text-gold-300/70 mx-auto" aria-hidden />
        <p className="font-display text-xl sm:text-2xl text-[#F4E7C1] tracking-tight">
          Your cinematic story is ready.
        </p>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 6 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="text-sm text-luxe/55 max-w-md mx-auto leading-relaxed italic"
        >
          {headline}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-[11px] tracking-[0.2em] uppercase text-gold-300/60 pt-1"
        >
          Hook · Script · Visual direction
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
