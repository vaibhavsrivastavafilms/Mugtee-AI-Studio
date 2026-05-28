'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedScene } from '@/lib/cinematic/generation'

export function LiveStoryboardBuild({
  scenes,
  completedIndices,
  frames,
  className,
}: {
  scenes: GeneratedScene[]
  completedIndices: number[]
  frames: string[]
  className?: string
}) {
  const visible: GeneratedScene[] =
    scenes.length > 0
      ? scenes
      : Array.from({ length: 3 }, (_, i) => ({
          id: `placeholder-${i}`,
          title: `Scene ${i + 1}`,
          description: '',
          duration: 4,
          visualPrompt: '',
          imagePrompt: '',
          cameraAngle: '',
          lightingMood: '',
          environment: '',
          colorPalette: '',
          movementStyle: '',
          imageUrl: null,
        }))

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-luxe', className)}>
      <AnimatePresence mode="popLayout">
        {visible.map((scene, i) => {
          const revealed = completedIndices.includes(i)
          const frame = frames[i] || scene.imageUrl || undefined

          return (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.45 }}
              className={cn(
                'relative shrink-0 w-16 h-24 sm:w-[72px] sm:h-[104px] rounded-lg overflow-hidden border transition-colors duration-500',
                revealed
                  ? 'border-[#D4AF37]/35 shadow-[0_0_12px_rgba(212,175,55,0.1)]'
                  : 'border-white/[0.08] bg-white/[0.03]'
              )}
            >
              {frame ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={frame}
                  alt={scene.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#2B1A08] via-[#120D08] to-black flex items-center justify-center">
                  <Film className="w-4 h-4 text-[#D4AF37]/35" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-[8px] text-white/50 truncate">{scene.title}</p>
              </div>
              {!revealed ? (
                <div className="absolute inset-0 shimmer-cinematic opacity-30" aria-hidden />
              ) : null}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
