'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type BeforeAfterSliderProps = {
  beforeLabel?: string
  afterLabel?: string
  beforeText: string
  afterPoster: string
  className?: string
}

/** Split reveal: creator input → finished cinematic frame. */
export function BeforeAfterSlider({
  beforeLabel = 'Input',
  afterLabel = 'Final video',
  beforeText,
  afterPoster,
  className,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(52)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#0D0D0D] shadow-[0_24px_80px_rgba(0,0,0,0.55)]',
        className
      )}
    >
      <div className="relative aspect-video w-full select-none">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${afterPoster})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        <div
          className="absolute inset-0 bg-[#141414]"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <div className="flex h-full flex-col justify-center px-6 sm:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              {beforeLabel}
            </p>
            <p className="mt-3 max-w-md font-display text-2xl leading-snug text-white sm:text-3xl">
              {beforeText}
            </p>
          </div>
        </div>

        <div
          className="absolute inset-y-0 z-10 w-0.5 bg-[#D4AF37]"
          style={{ left: `${position}%` }}
          aria-hidden
        >
          <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37] bg-[#050505] shadow-[0_0_24px_rgba(212,175,55,0.35)]" />
        </div>

        <label className="sr-only" htmlFor="before-after-range">
          Reveal final video
        </label>
        <input
          id="before-after-range"
          type="range"
          min={8}
          max={92}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="absolute inset-0 z-20 cursor-ew-resize opacity-0"
        />

        <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80">
          {beforeLabel}
        </span>
        <span className="absolute bottom-3 right-3 rounded-full border border-[#D4AF37]/35 bg-black/50 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[#D4AF37]">
          {afterLabel}
        </span>
      </div>
    </div>
  )
}
