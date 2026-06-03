'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { shouldUnoptimizeImageSrc } from '@/lib/image/ephemeral-image-url'

export function FilmRevealPoster({
  posterUrl,
  title,
  hook,
  onPlay,
  className,
}: {
  posterUrl: string | null
  title: string
  hook: string
  onPlay?: () => void
  className?: string
}) {
  return (
    <motion.div
      className={cn('relative mx-auto w-full max-w-[280px]', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <motion.div
        className="absolute -inset-6 rounded-[2rem] bg-gold-500/[0.12] blur-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        aria-hidden
      />

      <motion.div
        className="relative aspect-[9/16] rounded-[1.35rem] overflow-hidden border border-gold-500/35 bg-black shadow-cinema"
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="absolute inset-0 bg-black z-20 pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />

        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={title || 'Reel poster'}
            fill
            sizes="280px"
            className="object-cover"
            priority
            unoptimized={shouldUnoptimizeImageSrc(posterUrl)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2B1A08] via-black to-black" />
        )}

        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-gold-200/25 to-transparent skew-x-12 pointer-events-none z-10"
          initial={{ x: '-120%' }}
          animate={{ x: '120%' }}
          transition={{ duration: 1.2, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none z-[5]" />

        <div className="absolute inset-x-0 bottom-0 p-4 z-[6] space-y-1 pointer-events-none">
          {title ? (
            <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/75 truncate">
              {title}
            </p>
          ) : null}
          {hook ? (
            <p className="font-display text-[15px] text-[#F4E7C1] italic leading-snug line-clamp-2">
              {hook}
            </p>
          ) : null}
        </div>

        {onPlay ? (
          <button
            type="button"
            onClick={onPlay}
            className="absolute inset-0 z-[8] flex items-center justify-center group"
            aria-label="Play preview"
          >
            <motion.span
              className="flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/45 bg-black/60 text-gold-100 shadow-lg backdrop-blur-sm"
              animate={{
                scale: [1, 1.06, 1],
                boxShadow: [
                  '0 0 0 rgba(212,175,55,0.2)',
                  '0 0 24px rgba(212,175,55,0.45)',
                  '0 0 0 rgba(212,175,55,0.2)',
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Play className="h-6 w-6 ml-0.5" aria-hidden />
            </motion.span>
          </button>
        ) : null}
      </motion.div>
    </motion.div>
  )
}
