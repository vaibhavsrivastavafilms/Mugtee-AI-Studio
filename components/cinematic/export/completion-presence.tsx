'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CompletionPresence({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'relative rounded-[32px] border border-[#D4AF37]/25 bg-gradient-to-br from-[#2B1A08]/40 via-black/40 to-black overflow-hidden p-8 sm:p-12 text-center max-w-2xl mx-auto min-h-[420px] flex flex-col justify-center workflow-presence-glow cinematic-success-glow cinematic-identity-glow cinematic-vignette-soft pacing-awareness-glow immersive-session-fade directing-focus-glow cinematic-operating-depth emotional-production-glow cinematic-environment-focus',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1),transparent_65%)] pointer-events-none atmosphere-breathing-layer" />
      <div className="relative">{children}</div>
    </section>
  )
}
