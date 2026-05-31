'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MugteeSidekickAvatar } from '@/components/sidekick/mugtee-sidekick-avatar'
import { MissionTimeline } from '@/components/mission/mission-timeline'
import { MugteeCommentary } from '@/components/mission/mugtee-commentary'
import { StoryScoreCard } from '@/components/mission/story-score-card'
import { DailyQuestCard } from '@/components/mission/daily-quest-card'
import { ProjectCompletionMeter } from '@/components/mission/project-completion-meter'
import { CreatorLevelBadge } from '@/components/mission/creator-level-badge'
import { AchievementToast } from '@/components/mission/achievement-toast'
import { deriveStoryScore } from '@/lib/mission/story-score'
import { missionCompletionPercent } from '@/lib/mission/mission-steps'
import { useMissionGenerationSync } from '@/lib/mission/use-mission-generation-sync'
import { useMissionStore } from '@/stores/mission-store'
import { useContentQualityStore } from '@/stores/content-quality-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import type { CommentaryStage } from '@/lib/mission/commentary-messages'
import { cn } from '@/lib/utils'

function XpFloat() {
  const floatingXp = useMissionStore((s) => s.floatingXp)
  const clearFloatingXp = useMissionStore((s) => s.clearFloatingXp)

  useEffect(() => {
    if (!floatingXp) return
    const t = window.setTimeout(clearFloatingXp, 1800)
    return () => window.clearTimeout(t)
  }, [floatingXp, clearFloatingXp])

  return (
    <AnimatePresence>
      {floatingXp ? (
        <motion.span
          key={floatingXp.id}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -28 }}
          exit={{ opacity: 0 }}
          className="absolute -top-2 right-0 text-sm font-medium text-[var(--v2-gold)] pointer-events-none"
        >
          +{floatingXp.amount} XP
        </motion.span>
      ) : null}
    </AnimatePresence>
  )
}

export function GenerationMissionPanel({ complete = false }: { complete?: boolean }) {
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const qualityScore = useContentQualityStore((s) => s.contentQualityScore)

  useMissionGenerationSync(sectionStatus, generationStep, isGenerating || complete)

  const storyScore = deriveStoryScore(sectionStatus, qualityScore)
  const completion = missionCompletionPercent(sectionStatus, generationStep)

  const commentaryStage: CommentaryStage =
    generationStep === 'analyzing' || generationStep === 'title'
      ? 'contentDirectorBrief'
      : generationStep

  if (complete && generationStep !== 'complete') return null

  return (
    <>
      <AchievementToast />
      <div className="space-y-4 mb-6">
        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <MugteeSidekickAvatar size="sm" className="shrink-0" />
          <div className="relative text-center sm:text-left min-w-0 flex-1">
            <CreatorLevelBadge className="justify-center sm:justify-start mb-2" />
            <XpFloat />
            {!complete ? (
              <MugteeCommentary stage={commentaryStage} />
            ) : (
              <p className="text-sm text-luxe/70 italic">Director&apos;s cut complete.</p>
            )}
          </div>
        </div>

        <ProjectCompletionMeter percent={completion} />

        {!complete ? (
          <MissionTimeline
            sectionStatus={sectionStatus}
            generationStep={generationStep}
            compact
            className={cn('max-w-4xl mx-auto')}
          />
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
          <StoryScoreCard score={storyScore} />
          <DailyQuestCard />
        </div>
      </div>
    </>
  )
}
