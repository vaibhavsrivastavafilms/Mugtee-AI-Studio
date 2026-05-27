'use client'

import type { ReactNode } from 'react'
import { DirectorReadingMode } from '@/components/cinematic/director-reading-mode'
import { ScreenplayAtmosphereShell } from '@/components/cinematic/screenplay-atmosphere-shell'
import { EmotionalSequenceReader } from '@/components/cinematic/emotional-sequence-reader'
import { CinematicNoiseReducer } from '@/components/cinematic/cinematic-noise-reducer'
import { cn } from '@/lib/utils'

export function CinematicReadingEnvironment({
  children,
  stage = 'preview',
  seed = 0,
  className,
}: {
  children: ReactNode
  stage?: string
  seed?: number
  className?: string
}) {
  return (
    <CinematicNoiseReducer focused className={className}>
      <ScreenplayAtmosphereShell>
        <EmotionalSequenceReader stage={stage} seed={seed} className="mb-4" />
        <DirectorReadingMode>{children}</DirectorReadingMode>
      </ScreenplayAtmosphereShell>
    </CinematicNoiseReducer>
  )
}
