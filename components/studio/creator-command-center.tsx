'use client'

import { Suspense, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  MOBILE_TAB_LABELS,
  MOBILE_WORKSPACE_TABS,
  workspaceStageToTab,
  type WorkspaceStage,
} from '@/lib/studio/workspace-stages'
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

type CreatorCommandCenterProps = {
  projectId?: string
  className?: string
}

function CreatorCommandCenterInner({ projectId, className }: CreatorCommandCenterProps) {
  useQuickCutProjectHydration(projectId)

  const activeStage = useStudioWorkspaceStore((s) => s.activeStage)
  const setActiveStage = useStudioWorkspaceStore((s) => s.setActiveStage)
  const resetForProject = useStudioWorkspaceStore((s) => s.resetForProject)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)

  useEffect(() => {
    if (!projectId) return
    resetForProject(isComplete ? 'export' : 'idea')
  }, [projectId, resetForProject])

  const handleMobileTab = (stage: WorkspaceStage) => {
    setActiveStage(stage)
    setActiveStageTab(workspaceStageToTab(stage), true)
  }

  return (
    <div
      className={cn(
        'flex flex-col min-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-4.5rem)]',
        className
      )}
    >
      <StudioCommandPalettePlaceholder />
      <StudioGlobalSearchPlaceholder />

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
        <StoryTimeline />

        <div className="flex flex-col min-h-0 min-w-0 border-t lg:border-t-0 border-white/[0.06]">
          <StudioMainWorkspace />
        </div>

        <StudioDirectorPanel />
      </motion.div>

      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-[#050505]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
        aria-label="Workspace stages"
      >
        <ul className="flex items-stretch justify-around px-1 pt-1">
          {MOBILE_WORKSPACE_TABS.map((stage) => {
            const active = activeStage === stage
            return (
              <li key={stage} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleMobileTab(stage)}
                  className={cn(
                    'w-full py-2.5 px-1 text-[9px] tracking-[0.12em] uppercase transition',
                    active
                      ? 'text-gold-200 border-t-2 border-gold-500/70 -mt-px'
                      : 'text-luxe/45 border-t-2 border-transparent'
                  )}
                >
                  {MOBILE_TAB_LABELS[stage] ?? stage}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="lg:hidden h-16 shrink-0" aria-hidden />
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
