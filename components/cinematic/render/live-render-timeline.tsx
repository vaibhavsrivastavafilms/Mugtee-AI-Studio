'use client'

import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export function LiveRenderTimeline({
  scenes,
  completedIndices,
  activeIndex,
  className,
}: {
  scenes: GeneratedScene[]
  completedIndices: number[]
  activeIndex: number
  className?: string
}) {
  if (scenes.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      className={cn(
        'glass rounded-2xl border border-white/[0.06] px-4 py-3 overflow-x-auto',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-max">
        {scenes.map((scene, i) => {
          const done = completedIndices.includes(i)
          const active = i === activeIndex && !done
          const label = scene.title || `Scene ${i + 1}`

          return (
            <div key={scene.id} className="flex items-center gap-3">
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-wide whitespace-nowrap transition-all duration-300',
                  done && 'bg-[#D4AF37]/15 text-[#C8A24E] border border-[#D4AF37]/25',
                  active && 'bg-white/[0.06] text-[#F4E7C1] border border-[#D4AF37]/40 shadow-[0_0_12px_rgba(212,175,55,0.12)]',
                  !done && !active && 'text-white/25 border border-transparent'
                )}
              >
                {done ? (
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                ) : active ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <span className="w-3 h-3 flex items-center justify-center text-white/30">·</span>
                )}
                <span>{label}</span>
              </div>
              {i < scenes.length - 1 ? (
                <span className="text-white/15 text-xs">—</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
