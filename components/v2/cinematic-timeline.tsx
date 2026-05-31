'use client'

import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import { MissionTimeline } from '@/components/mission/mission-timeline'
import { cn } from '@/lib/utils'

/** Legacy cinematic timeline — delegates to mission timeline during generation. */
export function CinematicTimeline({
  currentStep,
  sectionStatus,
  className,
}: {
  currentStep: string
  sectionStatus?: SectionStatusMap
  className?: string
}) {
  if (!sectionStatus) {
    return null
  }

  return (
    <MissionTimeline
      sectionStatus={sectionStatus}
      generationStep={currentStep as QuickCutGenerationStep}
      className={cn(className)}
      compact
    />
  )
}
