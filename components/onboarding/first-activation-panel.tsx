'use client'

import { cn } from '@/lib/utils'
import { CinematicExampleCards } from '@/components/onboarding/cinematic-example-cards'
import { QuickStartTemplates } from '@/components/onboarding/quick-start-templates'
import { InspirationCarousel } from '@/components/onboarding/inspiration-carousel'
import { GuidedFirstProject } from '@/components/onboarding/guided-first-project'
import { WhatMugteeGenerates } from '@/components/onboarding/what-mugtee-generates'

type FirstActivationPanelProps = {
  onSelectPrompt: (prompt: string, options?: { launch?: boolean }) => void
  onLaunch?: (prompt: string) => void
  className?: string
  /** Compact layout for conversation entry path */
  variant?: 'full' | 'compact'
}

export function FirstActivationPanel({
  onSelectPrompt,
  onLaunch,
  className,
  variant = 'full',
}: FirstActivationPanelProps) {
  const handleSelect = (prompt: string, options?: { launch?: boolean }) => {
    onSelectPrompt(prompt, options)
    if (options?.launch && onLaunch) onLaunch(prompt)
  }

  return (
    <div className={cn('space-y-6', className)}>
      <GuidedFirstProject
        onComplete={(prompt) => onSelectPrompt(prompt)}
        onLaunch={onLaunch}
      />

      <CinematicExampleCards onSelect={handleSelect} />

      <QuickStartTemplates onSelect={(prompt) => onSelectPrompt(prompt)} />

      {variant === 'full' ? (
        <>
          <InspirationCarousel onSelect={(topic) => onSelectPrompt(topic)} />
          <WhatMugteeGenerates compact />
        </>
      ) : (
        <InspirationCarousel onSelect={(topic) => onSelectPrompt(topic)} />
      )}
    </div>
  )
}
