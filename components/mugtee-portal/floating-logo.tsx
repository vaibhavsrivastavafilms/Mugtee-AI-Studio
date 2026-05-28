'use client'

import { motion } from 'framer-motion'

export function FloatingLogo() {
  return (
    <motion.div
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute -inset-8 rounded-full bg-gold-500/[0.12] blur-3xl animate-pulse" />
      <motion.div
        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gold-gradient flex items-center justify-center shadow-gold-glow"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="font-display text-2xl sm:text-3xl text-black font-black">M</span>
      </motion.div>
      <span className="mt-3 font-display text-sm tracking-[0.2em] uppercase text-gold-gradient">
        Mugtee
      </span>
    </motion.div>
  )
}
