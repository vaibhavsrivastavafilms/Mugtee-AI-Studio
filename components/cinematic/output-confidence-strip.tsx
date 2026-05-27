'use client'

import type { ReactNode } from 'react'
import { getContextualConfidenceLines } from '@/lib/creator/output-confidence'

export function OutputConfidenceStrip({
  niche,
  style,
  platform,
  rewriteMode,
}: {
  niche?: string | null
  style?: string | null
  platform?: string | null
  rewriteMode?: string | null
}) {
  const [primary, secondary] = getContextualConfidenceLines({
    niche,
    style,
    platform,
    rewriteMode,
  })

  return (
    <div className="relative mb-6">
      <div className="absolute inset-x-6 top-1/2 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/25 to-transparent pointer-events-none opacity-80" />
      <div className="absolute inset-x-12 top-1/2 h-8 -translate-y-1/2 bg-[#D4AF37]/[0.03] blur-xl pointer-events-none" />
      <div className="relative flex flex-wrap items-center justify-center gap-2 py-1">
        <ConfidencePill>{primary}</ConfidencePill>
        <ConfidencePill>{secondary}</ConfidencePill>
      </div>
    </div>
  )
}

function ConfidencePill({ children }: { children: ReactNode }) {
  return (
    <span className="px-3 py-1 rounded-full border border-white/[0.06] bg-black/30 text-[9px] sm:text-[10px] tracking-[0.16em] uppercase text-[#C8A24E]/70 shadow-[0_0_24px_rgba(212,175,55,0.04)]">
      {children}
    </span>
  )
}
