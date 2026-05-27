'use client'

import { useShallow } from 'zustand/react/shallow'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { ProjectAtmosphereHeader } from '@/components/cinematic/project-atmosphere-header'
import { ActiveSequencePresence } from '@/components/cinematic/active-sequence-presence'
import { EmotionalProductionThread } from '@/components/cinematic/emotional-production-thread'
import { cn } from '@/lib/utils'

export function CinematicProjectWorld({ className }: { className?: string }) {
  const { title, style, niche, prompt } = useCinematicProjectStore(
    useShallow((s) => ({
      title: s.title,
      style: s.style,
      niche: s.niche,
      prompt: s.prompt,
    }))
  )

  const hasWorld = Boolean(title?.trim() || prompt?.trim())
  if (!hasWorld) return null

  const seed = (title?.length ?? prompt.length) % 3

  return (
    <div
      className={cn(
        'mb-4 sm:mb-6 rounded-2xl border border-white/[0.04] bg-black/20 px-3 py-3 sm:py-4 cinematic-environment-focus',
        className
      )}
    >
      <ProjectAtmosphereHeader title={title} style={style} niche={niche} />
      <div className="flex flex-col items-center gap-1.5">
        <ActiveSequencePresence style={style} niche={niche} seed={seed} />
        <EmotionalProductionThread style={style} niche={niche} seed={seed + 1} />
      </div>
    </div>
  )
}
