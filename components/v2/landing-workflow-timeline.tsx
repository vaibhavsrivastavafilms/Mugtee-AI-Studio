'use client'

import { FileText, LayoutGrid, Lightbulb, Mic, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'idea', label: 'Idea', icon: Lightbulb },
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'storyboard', label: 'Storyboard', icon: LayoutGrid },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'publish', label: 'Publish', icon: Upload },
] as const

export function LandingWorkflowTimeline({ className }: { className?: string }) {
  return (
    <section className={cn('px-5 sm:px-6 py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-3">
            How Mugtee Works
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
            Idea to publish in one flow
          </h2>
        </div>

        <div className="relative">
          <div
            className="absolute top-[22px] left-[10%] right-[10%] h-px hidden sm:block bg-[linear-gradient(90deg,transparent,var(--v2-gold)_8%,var(--v2-gold)_92%,transparent)]"
            aria-hidden
          />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 sm:gap-4">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.id} className="flex flex-col items-center text-center gap-3">
                  <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)]">
                    <Icon className="h-5 w-5 text-[var(--v2-gold)]" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] tracking-[0.22em] uppercase text-[var(--v2-text-primary)]">
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
