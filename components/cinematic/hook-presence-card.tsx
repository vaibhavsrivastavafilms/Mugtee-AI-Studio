'use client'

import { useMemo } from 'react'
import { getHookEmphasisLine } from '@/lib/creator/output-presence'
import { ScriptEmphasisPulse } from '@/components/cinematic/script-emphasis-pulse'

export function HookPresenceCard({
  hook,
  subtitle = 'Emotional pacing established for vertical storytelling',
}: {
  hook: string
  subtitle?: string
}) {
  const emphasis = useMemo(() => getHookEmphasisLine(hook.length % 3), [hook])

  if (!hook.trim()) return null

  return (
    <section className="hook-presence-enter relative rounded-[28px] border border-[#D4AF37]/18 bg-gradient-to-br from-[#2B1A08]/35 via-black/25 to-black/45 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none storyboard-edge-fade" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/25 to-transparent" />

      <div className="relative p-6 sm:p-8 max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[10px] tracking-[0.32em] uppercase text-[#C8A24E]/90">
            Opening Beat
          </span>
          <span className="text-[9px] tracking-[0.2em] uppercase text-white/30">
            · {emphasis}
          </span>
        </div>

        <ScriptEmphasisPulse active>
          <p className="font-display text-[clamp(1.3rem,4.2vw,1.75rem)] leading-[1.42] text-[#F4E7C1] whitespace-pre-wrap text-balance">
            {hook}
          </p>
        </ScriptEmphasisPulse>

        <p className="mt-5 text-[10px] tracking-[0.18em] uppercase text-white/32 border-t border-white/[0.05] pt-4">
          {subtitle}
        </p>
      </div>
    </section>
  )
}
