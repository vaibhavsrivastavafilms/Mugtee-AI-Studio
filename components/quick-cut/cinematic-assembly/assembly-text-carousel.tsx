'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ASSEMBLY_STATUS_LINES } from '@/lib/cinematic/quick-cut/cinematic-assembly-timing'

export function AssemblyTextCarousel({ lineIndex }: { lineIndex: number }) {
  const line = ASSEMBLY_STATUS_LINES[lineIndex % ASSEMBLY_STATUS_LINES.length]

  return (
    <div className="relative min-h-[2.5rem] flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        <motion.p
          key={line}
          initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-lg sm:text-xl text-[#F4E7C1] italic text-center leading-snug"
        >
          {line}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
