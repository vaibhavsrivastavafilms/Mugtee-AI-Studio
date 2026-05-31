'use client'

import { motion } from 'framer-motion'
import { PartyPopper } from 'lucide-react'
import { cn } from '@/lib/utils'
import { companionCopy } from '@/lib/companion/microcopy'

type CelebrationStateProps = {
  title?: string
  className?: string
}

export function CelebrationState({ title, className }: CelebrationStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'rounded-2xl border border-gold-500/25 bg-gold-500/[0.06] p-5 text-center space-y-2',
        className
      )}
    >
      <PartyPopper className="w-6 h-6 text-gold-300 mx-auto" />
      <p className="font-display text-lg text-[#F4E7C1]">{companionCopy('storyReady')}</p>
      {title ? (
        <p className="text-sm text-luxe/70 italic">&ldquo;{title}&rdquo;</p>
      ) : null}
      <p className="text-[12px] text-luxe/55">{companionCopy('celebrationDefault')}</p>
    </motion.div>
  )
}
