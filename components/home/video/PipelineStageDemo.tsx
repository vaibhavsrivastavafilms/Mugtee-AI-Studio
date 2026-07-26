'use client'

import { useEffect, useState } from 'react'
import { PIPELINE_STAGES } from '@/lib/home/landing-demos'
import { cn } from '@/lib/utils'

type PipelineStageDemoProps = {
  poster: string
  className?: string
  active?: boolean
}

/** Cinematic stage reel when MP4 assets are unavailable. */
export function PipelineStageDemo({ poster, className, active = true }: PipelineStageDemoProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % PIPELINE_STAGES.length)
    }, 1600)
    return () => window.clearInterval(id)
  }, [active])

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[#0D0D0D]',
        className
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center opacity-50 transition-transform duration-[2400ms] ease-out"
        style={{
          backgroundImage: `url(${poster})`,
          transform: `scale(${1.08 + (index % 3) * 0.03})`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.12),transparent_60%)]" />

      <div className="relative flex h-full min-h-[16rem] flex-col justify-end p-5 sm:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D4AF37]">
          Creating
        </p>
        <p className="mt-2 font-display text-3xl text-white sm:text-4xl">
          {PIPELINE_STAGES[index]}
        </p>
        <ol className="mt-5 flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <li
              key={stage}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]',
                i === index
                  ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#E6C252]'
                  : i < index
                    ? 'border-white/10 text-[#888888]'
                    : 'border-white/[0.06] text-[#888888]/70'
              )}
            >
              {stage}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
