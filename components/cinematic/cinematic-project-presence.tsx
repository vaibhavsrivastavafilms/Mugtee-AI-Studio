'use client'

import { useMemo } from 'react'
import { getProjectEnvironmentLine } from '@/lib/creator/master-cinematic-copy'
import { CinematicProjectCover } from '@/components/cinematic/cinematic-project-cover'
import { ProjectAtmosphereHeader } from '@/components/cinematic/project-atmosphere-header'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  create: 'Story forming',
  generating: 'Generating',
  preview: 'Screenplay',
  director: 'Directing',
  scenes: 'Storyboard',
  voiceover: 'Voice',
  compile: 'Delivery',
}

export function CinematicProjectPresence({
  title,
  prompt,
  style,
  niche,
  status,
  className,
}: {
  title?: string | null
  prompt?: string | null
  style?: string | null
  niche?: string | null
  status: string
  className?: string
}) {
  const environmentLine = useMemo(
    () => getProjectEnvironmentLine(title, style, niche),
    [title, style, niche]
  )

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-[8px] tracking-[0.22em] uppercase text-[#C8A24E]/55 text-center cinematic-world-breathing">
        {environmentLine}
      </p>
      <ProjectAtmosphereHeader
        title={title}
        style={style}
        niche={niche}
        className="mb-0"
      />
      <CinematicProjectCover
        title={title || 'Untitled production'}
        prompt={prompt ?? undefined}
        style={style}
        niche={niche}
        statusLabel={STATUS_LABEL[status] ?? status}
        className="hidden sm:block"
      />
    </div>
  )
}
