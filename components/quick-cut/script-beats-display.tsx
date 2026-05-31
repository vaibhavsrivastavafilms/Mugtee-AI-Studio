'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScriptBeat } from '@/types/cinematic-script'

function BeatCard({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.08] bg-black/40 px-3.5 py-3',
        className
      )}
    >
      <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/80 mb-2 font-medium">
        {label}
      </p>
      {children}
    </div>
  )
}

function DurationBadge({ duration }: { duration: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-gold-500/25 bg-gold-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-gold-200/90 tabular-nums">
      [{duration}]
    </span>
  )
}

export function ScriptBeatsDisplay({
  hook,
  scriptBeats,
  payoff,
  cta,
  active,
  className,
  selectable,
}: {
  hook: string
  scriptBeats: ScriptBeat[]
  payoff?: string
  cta?: string
  active?: boolean
  className?: string
  selectable?: boolean
}) {
  const [revealedCount, setRevealedCount] = useState(active ? 0 : scriptBeats.length + 3)

  useEffect(() => {
    if (!active) {
      setRevealedCount(scriptBeats.length + 3)
      return
    }
    setRevealedCount(0)
    let count = 0
    const total = scriptBeats.length + (payoff ? 1 : 0) + (cta ? 1 : 0) + (hook ? 1 : 0)
    const id = window.setInterval(() => {
      count += 1
      setRevealedCount(count)
      if (count >= total) window.clearInterval(id)
    }, 120)
    return () => window.clearInterval(id)
  }, [active, scriptBeats.length, payoff, cta, hook])

  if (!hook && !scriptBeats.length) return null

  const selectClass = selectable ? 'select-text' : 'select-none'

  let step = 0
  const showHook = hook && revealedCount > step++
  const visibleBeats = scriptBeats.filter((_, i) => revealedCount > step + i)
  step += scriptBeats.length
  const showPayoff = payoff && revealedCount > step++
  const showCta = cta && revealedCount > step

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-2.5',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-1">
        <Film className="w-3 h-3" /> Cinematic Script
      </div>

      {showHook ? (
        <BeatCard label="Hook">
          <p
            data-rewrite-type="hook"
            className={cn(
              'font-display text-base sm:text-lg text-[#F4E7C1] italic leading-snug',
              selectClass
            )}
          >
            {hook}
          </p>
        </BeatCard>
      ) : null}

      {visibleBeats.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/60 px-0.5">
            Script Beats
          </p>
          <ul className="space-y-2 max-h-[min(360px,45vh)] overflow-y-auto scrollbar-luxe">
            {visibleBeats.map((beat, i) => (
              <li
                key={`beat-${i}`}
                className="rounded-lg border border-white/[0.06] bg-black/35 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-luxe/45">
                    {beat.label?.trim() || `Beat ${i + 1}`}
                  </span>
                  {beat.duration ? <DurationBadge duration={beat.duration} /> : null}
                </div>
                <p
                  data-rewrite-type="script"
                  className={cn('text-sm text-luxe/90 leading-snug font-serif', selectClass)}
                >
                  {beat.narration}
                </p>
                {beat.emotion ? (
                  <p className="text-[10px] text-gold-300/50 mt-1.5 tracking-wide uppercase">
                    {beat.emotion}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showPayoff && payoff ? (
        <BeatCard label="Payoff">
          <p
            data-rewrite-type="script"
            className={cn('text-sm text-luxe/90 leading-snug font-serif italic', selectClass)}
          >
            {payoff}
          </p>
        </BeatCard>
      ) : null}

      {showCta && cta ? (
        <BeatCard label="CTA">
          <p
            data-rewrite-type="caption"
            className={cn('text-sm text-gold-200/85 leading-snug font-medium', selectClass)}
          >
            {cta}
          </p>
        </BeatCard>
      ) : null}

      {active && revealedCount < scriptBeats.length + 3 ? (
        <span className="inline-block w-[2px] h-[14px] bg-gold-400/80 ml-1 animate-pulse" />
      ) : null}
    </div>
  )
}
