'use client'

import { cn } from '@/lib/utils'
import type { WordTiming } from '@/lib/cinematic/captions/word-timing'

export function KaraokeCaptionOverlay({
  words,
  activeIndex,
  className,
  title,
}: {
  words: WordTiming[]
  activeIndex: number
  className?: string
  title?: string
}) {
  if (words.length === 0) return null

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 p-3 space-y-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none',
        className
      )}
    >
      {title ? (
        <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/70 truncate">
          {title}
        </p>
      ) : null}
      <p className="font-display text-[13px] italic leading-snug line-clamp-3">
        {words.map((word, i) => (
          <span
            key={`${word.text}-${i}`}
            className={cn(
              'transition-colors duration-150',
              i < activeIndex && 'text-gold-300/45',
              i === activeIndex && 'text-[#F4E7C1] font-medium drop-shadow-[0_0_8px_rgba(212,175,55,0.35)]',
              i > activeIndex && 'text-white/30'
            )}
          >
            {word.text}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
    </div>
  )
}
