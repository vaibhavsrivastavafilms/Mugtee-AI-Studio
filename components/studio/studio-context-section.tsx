'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type StudioContextSectionProps = {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
  maxHeightClass?: string
}

export function StudioContextSection({
  title,
  expanded,
  onToggle,
  children,
  className,
  maxHeightClass = 'max-h-[280px]',
}: StudioContextSectionProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-white/[0.06] bg-black/30 overflow-hidden',
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-gold-300/70 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="w-3 h-3 text-luxe/40 shrink-0" aria-hidden />
        )}
        <span className="text-[10px] tracking-[0.2em] uppercase text-luxe/75">{title}</span>
      </button>
      {expanded ? (
        <div
          className={cn(
            'px-3 pb-3 pt-0 space-y-2 overflow-y-auto scrollbar-luxe',
            maxHeightClass
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
