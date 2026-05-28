'use client'

import { motion } from 'framer-motion'
import {
  Clapperboard,
  Film,
  Layers,
  LayoutGrid,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PANELS = [
  {
    id: 'timeline',
    label: 'Timeline',
    icon: Layers,
    className: 'col-span-2 row-span-1',
    preview: (
      <div className="flex gap-1.5 h-full items-end px-2 pb-2">
        {[40, 65, 45, 80, 55, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gold-500/20 border border-gold-500/15"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    ),
  },
  {
    id: 'storyboard',
    label: 'Storyboard',
    icon: LayoutGrid,
    className: 'col-span-1 row-span-2',
    preview: (
      <div className="grid grid-cols-2 gap-1 p-2 h-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md bg-white/[0.04] border border-white/[0.06] aspect-square"
          />
        ))}
      </div>
    ),
  },
  {
    id: 'inspector',
    label: 'Scene Inspector',
    icon: Film,
    className: 'col-span-1 row-span-1',
    preview: (
      <div className="p-2 space-y-1.5">
        {[72, 48, 56].map((w, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-white/[0.06]"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    ),
  },
  {
    id: 'visual',
    label: 'Visual Direction',
    icon: Sparkles,
    className: 'col-span-1 row-span-1',
    preview: (
      <div className="p-2 flex items-center justify-center h-full">
        <div className="w-10 h-10 rounded-full border border-gold-500/30 bg-gold-500/10" />
      </div>
    ),
  },
  {
    id: 'compile',
    label: 'Compile',
    icon: Clapperboard,
    className: 'col-span-2 row-span-1',
    preview: (
      <div className="flex items-center gap-2 px-3 h-full">
        <div className="h-2 flex-1 rounded-full bg-gold-500/20 overflow-hidden">
          <div className="h-full w-2/3 bg-gold-gradient rounded-full" />
        </div>
        <span className="text-[9px] tracking-wider uppercase text-gold-300/70">Rendering</span>
      </div>
    ),
  },
] as const

export function DirectorPreviewGallery() {
  return (
    <div className="relative w-full">
      <motion.div
        className="grid grid-cols-2 grid-rows-3 gap-2 h-[200px] sm:h-[220px] rounded-2xl border border-white/[0.08] bg-black/40 p-2 overflow-hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        {PANELS.map((panel, index) => {
          const Icon = panel.icon
          return (
            <motion.div
              key={panel.id}
              className={cn(
                'group/panel relative rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden',
                panel.className
              )}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.06 }}
              whileHover={{ scale: 1.02, borderColor: 'rgba(212,175,55,0.25)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500/[0.04] to-transparent opacity-0 group-hover/panel:opacity-100 transition-opacity duration-500" />
              <div className="relative z-[1] flex flex-col h-full">
                <div className="flex items-center gap-1.5 px-2 pt-2 pb-1">
                  <Icon className="w-3 h-3 text-luxe/40 group-hover/panel:text-gold-300/70 transition-colors" />
                  <span className="text-[8px] tracking-[0.22em] uppercase text-luxe/35 group-hover/panel:text-luxe/55 transition-colors">
                    {panel.label}
                  </span>
                </div>
                <div className="flex-1 min-h-0">{panel.preview}</div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
