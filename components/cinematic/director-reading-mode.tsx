'use client'

import type { ReactNode } from 'react'
import { EmotionalFocusLock } from '@/components/cinematic/emotional-focus-lock'
import { ScreenplayRhythmAnchor } from '@/components/cinematic/screenplay-rhythm-anchor'
import { cn } from '@/lib/utils'

export function DirectorReadingMode({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'relative rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-8 max-w-2xl mx-auto cinematic-reading-rhythm screenplay-flow-spacing directing-focus-glow',
        className
      )}
    >
      <EmotionalFocusLock />
      <div className="h-px w-full mb-5 cinematic-soft-divider" />
      <p className="text-[#C8A24E] uppercase tracking-[0.3em] text-[10px] mb-5">
        Directed Screenplay
      </p>
      {children}
      <ScreenplayRhythmAnchor seed={1} />
    </section>
  )
}
