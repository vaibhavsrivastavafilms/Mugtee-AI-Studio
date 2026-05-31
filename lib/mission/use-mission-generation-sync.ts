'use client'

import { useEffect, useRef } from 'react'
import type { SectionId, SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { XpEventType } from '@/lib/mission/xp-config'
import { deriveStoryScore } from '@/lib/mission/story-score'
import { useMissionStore } from '@/stores/mission-store'
import { useContentQualityStore } from '@/stores/content-quality-store'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

const SECTION_XP: Partial<Record<SectionId, XpEventType>> = {
  hook: 'hook',
  script: 'script',
  visualDirection: 'scenes',
  storyboard: 'visualPack',
  export: 'completedProject',
}

export function useMissionGenerationSync(
  sectionStatus: SectionStatusMap,
  generationStep: QuickCutGenerationStep,
  isGenerating: boolean
) {
  const prevStatus = useRef<SectionStatusMap | null>(null)
  const prevGenerating = useRef(false)
  const awardXp = useMissionStore((s) => s.awardXp)
  const markSectionAwarded = useMissionStore((s) => s.markSectionAwarded)
  const resetMissionSession = useMissionStore((s) => s.resetMissionSession)
  const fetchProfile = useMissionStore((s) => s.fetchProfile)
  const qualityScore = useContentQualityStore((s) => s.contentQualityScore)

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (isGenerating && !prevGenerating.current) {
      resetMissionSession()
      void awardXp(null, { incrementProjects: true })
    }
    prevGenerating.current = isGenerating
  }, [isGenerating, resetMissionSession, awardXp])

  useEffect(() => {
    if (!isGenerating && generationStep !== 'complete') {
      prevStatus.current = null
      return
    }

    const prev = prevStatus.current
    prevStatus.current = { ...sectionStatus }

    if (!prev) return

    for (const [section, event] of Object.entries(SECTION_XP) as [SectionId, XpEventType][]) {
      const was = prev[section]
      const now = sectionStatus[section]
      if (was !== 'completed' && now === 'completed' && markSectionAwarded(section)) {
        const storyScore =
          event === 'completedProject'
            ? deriveStoryScore(sectionStatus, qualityScore).overall
            : undefined
        void awardXp(event, { storyScore })
      }
    }
  }, [sectionStatus, generationStep, isGenerating, awardXp, markSectionAwarded, qualityScore])
}
