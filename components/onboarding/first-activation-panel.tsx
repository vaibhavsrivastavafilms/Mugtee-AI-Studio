'use client'

import { cn } from '@/lib/utils'
import { CinematicExampleCards } from '@/components/onboarding/cinematic-example-cards'
import { InspirationCarousel } from '@/components/onboarding/inspiration-carousel'
import { GuidedFirstProject } from '@/components/onboarding/guided-first-project'
import { WhatMugteeGenerates } from '@/components/onboarding/what-mugtee-generates'

type FirstActivationPanelProps = {
  onSelectPrompt: (prompt: string, options?: { launch?: boolean }) => void
  onLaunch?: (prompt: string) => void
  className?: string
}

export function FirstActivationPanel({
  onSelectPrompt,
  onLaunch,
  className,
}: FirstActivationPanelProps) {
  const handleSelect = (prompt: string, options?: { launch?: boolean }) => {
    onSelectPrompt(prompt, options)
    if (options?.launch && onLaunch) onLaunch(prompt)
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center mb-2 sm:mb-4">
        <p className="text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-gold-300/80 mb-2">
          Ask Mugtee
        </p>
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-gold-gradient leading-tight px-2">
          What are we creating today?
        </h1>
        <p className="mt-3 text-sm text-luxe/55 max-w-md mx-auto px-2">
          Pick a style or example — Mugtee handles hook, script, and visual direction.
        </p>
      </div>

      <GuidedFirstProject
        onComplete={(prompt) => onSelectPrompt(prompt)}
        onLaunch={onLaunch}
      />

      <CinematicExampleCards onSelect={handleSelect} />

      <InspirationCarousel onSelect={(topic) => onSelectPrompt(topic)} />

      <WhatMugteeGenerates compact />
    </div>
  )
}
