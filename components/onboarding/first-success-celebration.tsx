'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  hasCompletedFirstGeneration,
  markFirstGeneration,
} from '@/lib/onboarding/onboarding-state'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const CHECKLIST = [
  'Hook',
  'Script',
  'Storyboard',
  'Captions',
  'Thumbnail Idea',
] as const

type FirstSuccessCelebrationProps = {
  className?: string
}

export function FirstSuccessCelebration({ className }: FirstSuccessCelebrationProps) {
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isComplete || hasCompletedFirstGeneration()) return
    markFirstGeneration()
    setVisible(true)
  }, [isComplete])

  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'rounded-2xl border border-gold-500/25 bg-gradient-to-b from-gold-500/[0.08] to-black/30 p-5 space-y-4',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 text-gold-300 animate-pulse" aria-hidden />
        <p className="font-display text-lg text-[#F4E7C1]">Your creator project is ready.</p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CHECKLIST.map((item, index) => (
          <motion.li
            key={item}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + index * 0.06, duration: 0.3 }}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2"
          >
            <Check className="h-3.5 w-3.5 text-emerald-300 shrink-0" aria-hidden />
            <span className="text-sm text-luxe/85">{item}</span>
          </motion.li>
        ))}
      </ul>

      <p className="text-center text-[11px] text-luxe/50">
        Export, refine, or generate your next idea — you&apos;re activated.
      </p>
    </motion.div>
  )
}
