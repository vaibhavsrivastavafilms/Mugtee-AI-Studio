'use client'

import { Suspense, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useQuickCutProjectHydration } from '@/hooks/use-quick-cut-project-hydration'
import { StudioWorkflowRail } from '@/components/studio/studio-workflow-rail'
import { StoryTimeline } from '@/components/studio/story-timeline'
import { StudioMainWorkspace } from '@/components/studio/studio-main-workspace'
import { StudioInspectorPanel } from '@/components/studio/studio-inspector-panel'
import { StudioWorkspaceTopbar } from '@/components/studio/studio-workspace-topbar'
import { DirectorDesktopOnly } from '@/components/studio/director-desktop-only'
import { StudioGlobalSearchPlaceholder } from '@/components/studio/studio-global-search-placeholder'
import { ProjectRecoveryBanner } from '@/components/trust/project-recovery-banner'
import { QuickCutActivityTimeline } from '@/components/trust/quick-cut-activity-timeline'
import { MugteeFollowUpActions } from '@/components/quick-cut/mugtee-follow-up-actions'
import { StudioMobileProjectStrip } from '@/components/studio/studio-mobile-project-strip'

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
  const { userName } = useStore()

  const shellUser = {
    email: null as string | null,
    user_metadata: { full_name: userName, name: userName },
  }

  useEffect(() => {
    if (!projectId) return
    resetForProject(isComplete ? 'export' : 'idea')
  }, [projectId, resetForProject, isComplete])

  return (
    <div
      className={cn(
        'flex flex-col min-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-4.5rem)] -mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6',
        className
      )}
    >
      <StudioGlobalSearchPlaceholder />

      <StudioWorkspaceTopbar user={shellUser} className="hidden lg:flex" />

      {!projectId ? (
        <ProjectRecoveryBanner className="mx-3 sm:mx-4 mt-2" />
      ) : null}

      <div className="lg:hidden px-3 pt-2 space-y-2">
        <StudioMobileProjectStrip />
      </div>

      <DirectorDesktopOnly />

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'hidden lg:grid flex-1 min-h-0 min-w-0 lg:grid-cols-[72px_minmax(0,1fr)_320px]',
          'bg-[#0a0a0c] overflow-hidden'
        )}
      >
        <StudioWorkflowRail />

        <div className="lg:hidden shrink-0 border-b border-white/[0.06] px-2 py-2 overflow-x-auto">
          <StoryTimeline compact className="w-full" />
        </div>

        <div className="flex flex-col min-h-0 min-w-0 border-t lg:border-t-0 border-white/[0.06] bg-[#0D0D0F]">
          <StudioMainWorkspace projectId={projectId} />
        </div>

        <StudioInspectorPanel projectId={projectId} />

        <div className="lg:hidden shrink-0 border-t border-white/[0.06] px-3 py-2 space-y-2">
          <MugteeFollowUpActions />
          <QuickCutActivityTimeline
            projectId={savedProjectId}
            title={projectTitle || undefined}
          />
        </div>
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
