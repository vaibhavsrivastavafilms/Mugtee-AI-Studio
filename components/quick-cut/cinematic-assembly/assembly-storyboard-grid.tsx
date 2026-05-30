'use client'

import { motion } from 'framer-motion'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { cn } from '@/lib/utils'

export function AssemblyStoryboardGrid({
  scenes,
  className,
}: {
  scenes: GeneratedScene[]
  className?: string
}) {
  const frames = scenes.slice(0, 8)

  return (
    <motion.ul
      className={cn(
        'grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full max-w-md mx-auto',
        className
      )}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
      }}
    >
      {frames.map((scene, i) => {
        const src = scene.imageUrl?.trim() || resolveScenePreviewUrl(scene, i)
        const offset = i % 2 === 0 ? -4 : 4

        return (
          <motion.li
            key={scene.id || `frame-${i}`}
            variants={{
              hidden: { opacity: 0, scale: 0.82, y: 12 },
              visible: {
                opacity: 1,
                scale: 1,
                y: 0,
                transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
              },
            }}
            style={{ transform: `translateY(${offset}px)` }}
            className="relative"
          >
            <motion.div
              className={cn(
                'relative aspect-[9/16] rounded-lg overflow-hidden',
                'border border-gold-500/30 bg-black shadow-[0_8px_32px_rgba(0,0,0,0.55)]',
                'ring-1 ring-gold-400/20'
              )}
              animate={{
                boxShadow: [
                  '0 0 0 rgba(212,175,55,0)',
                  '0 0 28px rgba(212,175,55,0.35)',
                  '0 0 0 rgba(212,175,55,0)',
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={scene.title || `Scene ${i + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 shimmer-cinematic bg-white/[0.03]" />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-gold-500/10 pointer-events-none"
                aria-hidden
              />
              <span className="absolute bottom-1.5 left-1.5 text-[8px] tracking-[0.18em] uppercase text-gold-300/80">
                {String(i + 1).padStart(2, '0')}
              </span>
            </motion.div>
          </motion.li>
        )
      })}
    </motion.ul>
  )
}
