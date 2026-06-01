'use client'

import { Suspense, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useQuickCutProjectHydration } from '@/hooks/use-quick-cut-project-hydration'
import { StudioSidebar } from '@/components/studio/studio-sidebar'
import { StoryTimeline } from '@/components/studio/story-timeline'
import { StudioMainWorkspace } from '@/components/studio/studio-main-workspace'
import { StudioDirectorPanel } from '@/components/studio/studio-director-panel'
import { StudioStatusBar } from '@/components/studio/studio-status-bar'
import { StudioCommandPalettePlaceholder } from '@/components/studio/studio-command-palette-placeholder'
import { StudioGlobalSearchPlaceholder } from '@/components/studio/studio-global-search-placeholder'
import { ProjectImprovementActions } from '@/components/retention/project-improvement-actions'
import { ProjectMomentumBadgesFromStore } from '@/components/retention/project-momentum-badges'
import { CreateNewProjectButton } from '@/components/retention/create-new-project-button'
import { ProjectRecoveryBanner } from '@/components/trust/project-recovery-banner'
import { QuickCutActivityTimeline } from '@/components/trust/quick-cut-activity-timeline'

type CreatorCommandCenterProps = {
  projectId?: string
  className?: string
}

function CreatorCommandCenterInner({ projectId, className }: CreatorCommandCenterProps) {
  useQuickCutProjectHydration(projectId)

  const resetForProject = useStudioWorkspaceStore((s) => s.resetForProject)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const projectTitle = useQuickCutGenerationStore((s) => s.title)

  useEffect(() => {
    if (!projectId) return
    resetForProject(isComplete ? 'export' : 'idea')
  }, [projectId, resetForProject, isComplete])

  return (
    <div
      className={cn(
        'flex flex-col min-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-4.5rem)]',
        className
      )}
    >
      <StudioCommandPalettePlaceholder />
      <StudioGlobalSearchPlaceholder />

      {!projectId ? (
        <ProjectRecoveryBanner className="mb-3" />
      ) : null}

      <div className="mb-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <ProjectMomentumBadgesFromStore />
          <CreateNewProjectButton variant="inline" className="sm:ml-auto" />
        </div>
        <StudioStatusBar />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[240px_200px_minmax(0,1fr)_300px]',
          'rounded-2xl border border-white/[0.06] bg-black/25 backdrop-blur-md overflow-hidden'
        )}
      >
        <StudioSidebar projectId={projectId} />
        <div className="hidden lg:flex flex-col gap-3 min-h-0 border-r border-white/[0.06] p-2 overflow-y-auto scrollbar-luxe">
          <StoryTimeline />
          <QuickCutActivityTimeline
            projectId={savedProjectId}
            title={projectTitle || undefined}
          />
        </div>

        <div className="flex flex-col min-h-0 min-w-0 border-t lg:border-t-0 border-white/[0.06]">
          <StudioMainWorkspace projectId={projectId} />
        </div>

        <StudioDirectorPanel />
      </motion.div>
    </div>
  )
}

export function CreatorCommandCenter(props: CreatorCommandCenterProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Opening Command Center…
        </div>
      }
    >
      <CreatorCommandCenterInner {...props} />
    </Suspense>
  )
}
