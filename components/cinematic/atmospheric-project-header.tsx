'use client'

import { useMemo } from 'react'
import { resolveCreatorIdentity } from '@/lib/creator/creator-identity'
import { cn } from '@/lib/utils'

export function AtmosphericProjectHeader({
  title,
  style,
  niche,
  subtitle,
  className,
}: {
  title: string
  style?: string | null
  niche?: string | null
  subtitle?: string
  className?: string
}) {
  const identity = useMemo(
    () => resolveCreatorIdentity(style, niche),
    [style, niche]
  )

  return (
    <header
      className={cn(
        'text-center mb-6 sm:mb-8 px-2 cinematic-identity-glow rounded-2xl py-4 sm:py-5',
        className
      )}
    >
      <p className="text-[10px] tracking-[0.32em] uppercase text-[#C8A24E]/75 mb-2">
        {identity.label} production
      </p>
      <h2 className="font-display text-2xl sm:text-3xl text-[#F4E7C1] italic leading-snug">
        {title || 'Your cinematic sequence'}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-sm text-white/45 max-w-md mx-auto">{subtitle}</p>
      ) : (
        <p className="mt-2 text-[9px] tracking-[0.2em] uppercase text-white/30">
          {identity.tone}
        </p>
      )}
    </header>
  )
}
