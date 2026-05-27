'use client'

import { useShallow } from 'zustand/react/shallow'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { ProductionWorldShell } from '@/components/cinematic/production-world-shell'
import { CinematicProjectPresence } from '@/components/cinematic/cinematic-project-presence'
import { EmotionalSequenceEnvironment } from '@/components/cinematic/emotional-sequence-environment'
import { cn } from '@/lib/utils'

export function CinematicProjectEnvironment({ className }: { className?: string }) {
  const { title, style, niche, prompt, status } = useCinematicProjectStore(
    useShallow((s) => ({
      title: s.title,
      style: s.style,
      niche: s.niche,
      prompt: s.prompt,
      status: s.status,
    }))
  )

  const hasWorld = Boolean(title?.trim() || prompt?.trim())
  if (!hasWorld) return null

  return (
    <ProductionWorldShell className={cn('mb-4 sm:mb-6', className)}>
      <CinematicProjectPresence
        title={title}
        style={style}
        niche={niche}
        prompt={prompt}
        status={status}
      />
      <EmotionalSequenceEnvironment className="mt-2">
        <span className="sr-only">Sequence continuity</span>
      </EmotionalSequenceEnvironment>
    </ProductionWorldShell>
  )
}
