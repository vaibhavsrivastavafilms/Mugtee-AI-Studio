'use client'

import { Suspense, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useQuickCutProjectHydration } from '@/hooks/use-quick-cut-project-hydration'
import { ProjectNavRail } from '@/components/studio/project-nav-rail'
import { WorkflowContextPanel } from '@/components/studio/workflow-context-panel'
import { MainWorkspaceTabs } from '@/components/studio/main-workspace-tabs'
import { TimelineStudioPanel } from '@/components/studio/timeline-studio-panel'
import { StudioMainWorkspace } from '@/components/studio/studio-main-workspace'
import { StudioInspectorPanel } from '@/components/studio/studio-inspector-panel'
import { StudioWorkspaceTopbar } from '@/components/studio/studio-workspace-topbar'
import { DirectorDesktopOnly } from '@/components/studio/director-desktop-only'
import { StudioGlobalSearchPlaceholder } from '@/components/studio/studio-global-search-placeholder'
import { ProjectRecoveryBanner } from '@/components/trust/project-recovery-banner'
import { QuickCutActivityTimeline } from '@/components/trust/quick-cut-activity-timeline'
import { MugteeFollowUpActions } from '@/components/quick-cut/mugtee-follow-up-actions'
import { StudioMobileProjectStrip } from '@/components/studio/studio-mobile-project-strip'
import { StoryTimeline } from '@/components/studio/story-timeline'
import { DirectorStudioWorkflow } from '@/components/studio/director-studio-workflow'
import { isDirectorStudioV2Enabled } from '@/lib/director/feature-flag'

type CreatorCommandCenterProps = {
  projectId?: string
  className?: string
}

function CreatorCommandCenterInner({ projectId, className }: CreatorCommandCenterProps) {
  useQuickCutProjectHydration(projectId)

  const resetForProject = useStudioWorkspaceStore((s) => s.resetForProject)
  const activeStage = useStudioWorkspaceStore((s) => s.activeStage)

  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const projectTitle = useQuickCutGenerationStore((s) => s.title)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const generationState = useQuickCutGenerationStore((s) => s.generationState)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const { userName } = useStore()

  const shellUser = {
    email: null as string | null,
    user_metadata: { full_name: userName, name: userName },
  }

  useEffect(() => {
    if (!projectId) return
    resetForProject(isComplete ? 'export' : 'scenes')
  }, [projectId, resetForProject, isComplete])

  const showRecovery = generationStep === 'error' || generationStatus === 'failed'
  const showCinematicAssembly =
    generationState === 'assembling' ||
    generationState === 'revealing' ||
    generationState === 'preview'

  const hasWorkspaceContent =
    isGenerating ||
    isComplete ||
    generationStep !== 'idle' ||
    Boolean(script.trim()) ||
    scenes.length > 0 ||
    prompt.trim().length >= 6

  const directorStudioV2 = isDirectorStudioV2Enabled()

  const showV5Editor = useMemo(() => {
    if (directorStudioV2) return false
    if (showRecovery || showCinematicAssembly || !hasWorkspaceContent) return false
    if (activeStage === 'research' || activeStage === 'idea' || activeStage === 'export') {
      return scenes.length > 0 && activeStage !== 'export'
    }
    return scenes.length > 0
  }, [
    directorStudioV2,
    showRecovery,
    showCinematicAssembly,
    hasWorkspaceContent,
    activeStage,
    scenes.length,
  ])

  if (directorStudioV2) {
    return (
      <div className={cn('flex flex-col flex-1 min-h-0', className)}>
        <DirectorStudioWorkflow projectId={projectId} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col min-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-4.5rem)] -mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6 bg-[#060606]',
        className
      )}
    >
      <StudioGlobalSearchPlaceholder />
      <StudioWorkspaceTopbar user={shellUser} variant="director" className="hidden lg:flex" />

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
          'hidden lg:grid flex-1 min-h-0 min-w-0 overflow-hidden',
          showV5Editor
            ? 'lg:grid-cols-[260px_340px_minmax(0,1fr)_320px]'
            : 'lg:grid-cols-[260px_minmax(0,1fr)_320px]'
        )}
      >
        <ProjectNavRail />

        {showV5Editor ? <WorkflowContextPanel /> : null}

        <div className="flex flex-col min-h-0 min-w-0 border-x border-white/[0.06] bg-[#060606]">
          {showV5Editor ? (
            <>
              <MainWorkspaceTabs projectId={projectId} className="flex-1 min-h-0" />
              <TimelineStudioPanel projectId={projectId} />
            </>
          ) : (
            <StudioMainWorkspace projectId={projectId} className="flex-1" />
          )}
        </div>

        <StudioInspectorPanel projectId={projectId} />
      </motion.div>

      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        <div className="shrink-0 border-b border-white/[0.06] px-2 py-2 overflow-x-auto">
          <StoryTimeline compact className="w-full" />
        </div>
        <StudioMainWorkspace projectId={projectId} className="flex-1" />
        <div className="shrink-0 border-t border-white/[0.06] px-3 py-2 space-y-2">
          <MugteeFollowUpActions />
          <QuickCutActivityTimeline
            projectId={savedProjectId}
            title={projectTitle || undefined}
          />
        </div>
      </div>
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
