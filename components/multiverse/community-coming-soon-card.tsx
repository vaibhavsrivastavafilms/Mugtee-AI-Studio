'use client'

import { Lock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Community layer stub — full social/marketplace coming later. */
export function CommunityComingSoonCard({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/[0.08] border border-gold-500/20">
          <Users className="w-5 h-5 text-gold-300/80" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] tracking-[0.28em] uppercase text-luxe/45">Creator Multiverse</p>
            <span className="inline-flex items-center gap-1 text-[9px] tracking-[0.18em] uppercase text-luxe/40">
              <Lock className="w-3 h-3" />
              Coming soon
            </span>
          </div>
          <h3 className="font-display text-lg text-luxe/80">Community & marketplace</h3>
          <p className="text-[11px] text-luxe/45 mt-1 leading-relaxed">
            Follow creators, share legendary projects, and trade templates in the multiverse —
            your HQ and story vault are the foundation.
          </p>
        </div>
      </div>
    </section>
  )
}
