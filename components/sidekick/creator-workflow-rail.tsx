'use client'

import { cn } from '@/lib/utils'

const STAGES = [
  'Idea',
  'Hook',
  'Script',
  'Visuals',
  'Storyboard',
  'Voice',
  'Export',
] as const

export function CreatorWorkflowRail({
  activeIndex = 0,
  className,
}: {
  activeIndex?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3 overflow-x-auto scrollbar-luxe',
        className
      )}
      aria-label="Creator pipeline"
    >
      <p className="text-[9px] tracking-[0.24em] uppercase text-luxe/40 mb-2.5">
        Your pipeline
      </p>
      <ol className="flex items-center gap-1 min-w-max">
        {STAGES.map((stage, i) => {
          const active = i === activeIndex
          const done = i < activeIndex
          return (
            <li key={stage} className="flex items-center gap-1">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase border transition',
                  active
                    ? 'border-gold-500/45 bg-gold-500/15 text-gold-100 shadow-[0_0_16px_-6px_rgba(212,175,55,0.45)]'
                    : done
                      ? 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200/80'
                      : 'border-white/[0.06] text-luxe/40'
                )}
              >
                {stage}
              </span>
              {i < STAGES.length - 1 ? (
                <span
                  className={cn(
                    'text-[10px] select-none',
                    done ? 'text-emerald-400/50' : 'text-luxe/20'
                  )}
                  aria-hidden
                >
                  →
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
