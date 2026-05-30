'use client'

import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { cn } from '@/lib/utils'

const STEP_MESSAGES: Record<string, string[]> = {
  analyzing: ['Reading your idea…', 'Finding the emotional hook…'],
  title: ['Crafting the title…', 'Setting cinematic tone…'],
  hook: ['Writing the opening…', 'Building tension…'],
  script: ['Writing script…', 'Shaping documentary pacing…'],
  scenes: ['Breaking into scenes…', 'Structuring beats…'],
  visuals: ['Generating storyboard…', 'Painting light and mood…'],
  voice: ['Recording voice direction…', 'Setting cinematic pace…'],
  render: ['Assembling your reel…', 'Locking frames…'],
  complete: ['Your reel is ready.', 'Cinema, delivered.'],
}

type CinematicGenerationLoaderProps = {
  step?: string
  message?: string
  className?: string
}

export function CinematicGenerationLoader({
  step = 'script',
  message,
  className,
}: CinematicGenerationLoaderProps) {
  const messages = STEP_MESSAGES[step] ?? STEP_MESSAGES.script
  const displayMessage = message ?? messages[0]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5 py-10 px-6 text-center',
        className
      )}
    >
      <MugteeOrb state="thinking" size={72} useLogo />
      <div className="space-y-1">
        <p className="font-display text-lg sm:text-xl text-[var(--v2-text-primary)] italic">
          {displayMessage}
        </p>
        <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--v2-text-secondary)]">
          Mugtee is directing
        </p>
      </div>
    </div>
  )
}
