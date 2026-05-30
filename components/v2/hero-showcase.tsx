'use client'

import { useEffect, useState } from 'react'
import { Film, ImageIcon, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'prompt', label: 'Your idea', icon: Sparkles, detail: 'Why successful people feel empty…' },
  { id: 'storyboard', label: 'Storyboard', icon: ImageIcon, detail: '4 cinematic frames · warm key light' },
  { id: 'reel', label: 'Finished reel', icon: Film, detail: '9:16 · voice · captions · export ready' },
] as const

export function HeroShowcase({ className }: { className?: string }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((a) => (a + 1) % STEPS.length)
    }, 3200)
    return () => window.clearInterval(id)
  }, [])

  const step = STEPS[active]
  const Icon = step.icon

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-2xl rounded-2xl border border-[var(--v2-border)]',
        'bg-[var(--v2-surface)] overflow-hidden',
        className
      )}
    >
      <div className="flex border-b border-[var(--v2-border)]">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              'flex-1 py-3 text-[10px] tracking-[0.2em] uppercase transition-colors duration-150',
              i === active
                ? 'text-[var(--v2-gold)] border-b border-[var(--v2-gold)]'
                : 'text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)]'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="relative p-6 sm:p-8 min-h-[200px] flex flex-col items-center justify-center text-center v2-page-enter" key={step.id}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--v2-border)] bg-black/40">
          <Icon className="h-5 w-5 text-[var(--v2-gold)]" />
        </div>
        <p className="font-display text-lg sm:text-xl text-[var(--v2-text-primary)] italic leading-snug">
          {step.detail}
        </p>
        {step.id === 'storyboard' ? (
          <div className="mt-5 grid grid-cols-4 gap-2 w-full max-w-xs">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={cn(
                  'aspect-[9/16] rounded-md border border-[var(--v2-border)] bg-gradient-to-b from-white/[0.06] to-black/60 v2-page-enter',
                  n === 1 && '[animation-delay:80ms]',
                  n === 2 && '[animation-delay:160ms]',
                  n === 3 && '[animation-delay:240ms]',
                  n === 4 && '[animation-delay:320ms]'
                )}
              />
            ))}
          </div>
        ) : step.id === 'reel' ? (
          <div className="mt-5 w-24 aspect-[9/16] rounded-lg border-2 border-[var(--v2-gold)]/40 bg-black shadow-[0_0_40px_rgba(212,175,55,0.15)]" />
        ) : null}
      </div>
    </div>
  )
}
