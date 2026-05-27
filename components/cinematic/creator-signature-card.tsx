'use client'

import { useMemo } from 'react'
import {
  getCreatorSignatureLine,
  resolveCreatorIdentity,
} from '@/lib/creator/creator-identity'
import { cn } from '@/lib/utils'

export function CreatorSignatureCard({
  style,
  niche,
  title,
  className,
}: {
  style?: string | null
  niche?: string | null
  title?: string
  className?: string
}) {
  const signature = useMemo(
    () => getCreatorSignatureLine(style, niche),
    [style, niche]
  )
  const identity = useMemo(
    () => resolveCreatorIdentity(style, niche),
    [style, niche]
  )

  return (
    <section
      className={cn(
        'rounded-[24px] border border-[#D4AF37]/15 bg-gradient-to-br from-[#2B1A08]/30 via-black/20 to-black/35 p-4 sm:p-5 cinematic-identity-glow',
        className
      )}
      aria-label="Creator cinematic identity"
    >
      <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/80 mb-2">
        {signature}
      </p>
      {title ? (
        <p className="font-display text-base sm:text-lg text-[#F4E7C1] italic truncate mb-3">
          {title}
        </p>
      ) : null}
      <div className="h-px cinematic-soft-divider mb-3 opacity-70" />
      <p className="text-[9px] tracking-[0.2em] uppercase text-white/35">
        {identity.pacing} · {identity.tone}
      </p>
    </section>
  )
}
