'use client'

import { Lock } from 'lucide-react'
import { COMING_SOON_FEATURES } from '@/lib/sidekick/coming-soon'
import { cn } from '@/lib/utils'

export function ComingSoonCards({ className }: { className?: string }) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <p className="text-[10px] tracking-[0.32em] uppercase text-luxe/45 mb-1">On the horizon</p>
        <h2 className="font-display text-lg text-luxe/80">Coming soon to Mugtee</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {COMING_SOON_FEATURES.map((feature) => (
          <div
            key={feature.id}
            className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 opacity-75"
          >
            <div className="absolute top-3 right-3 flex items-center gap-1 text-[9px] tracking-[0.18em] uppercase text-luxe/40">
              <Lock className="w-3 h-3" />
              Soon
            </div>
            <p className="text-sm font-medium text-luxe/70 pr-12">{feature.title}</p>
            <p className="text-[11px] text-luxe/45 mt-1 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
