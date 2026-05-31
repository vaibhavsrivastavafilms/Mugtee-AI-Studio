'use client'

import { lazy, Suspense, useRef } from 'react'
import { RewriteProvider } from '@/components/director/rewrite-provider'
import { ContentReadinessTracker } from '@/components/workspace/content-readiness-tracker'
import { ExportHub } from '@/components/workspace/export-hub'
import { PlatformModeToggle } from '@/components/workspace/platform-mode-toggle'
import { QuickCreatorActions } from '@/components/workspace/quick-creator-actions'
import { WorkspaceSectionSkeleton } from '@/components/workspace/output-workspace/workspace-section-shell'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { cn } from '@/lib/utils'

const HookSection = lazy(() =>
  import('@/components/workspace/output-workspace/hook-section').then((m) => ({
    default: m.HookSection,
  }))
)
const ScriptSection = lazy(() =>
  import('@/components/workspace/output-workspace/script-section').then((m) => ({
    default: m.ScriptSection,
  }))
)
const StoryboardSection = lazy(() =>
  import('@/components/workspace/output-workspace/storyboard-section').then((m) => ({
    default: m.StoryboardSection,
  }))
)
const CaptionSection = lazy(() =>
  import('@/components/workspace/output-workspace/caption-section').then((m) => ({
    default: m.CaptionSection,
  }))
)
const ThumbnailSection = lazy(() =>
  import('@/components/workspace/output-workspace/thumbnail-section').then((m) => ({
    default: m.ThumbnailSection,
  }))
)

type OutputWorkspacePanelProps = {
  projectId?: string
  className?: string
}

function SectionFallback() {
  return <WorkspaceSectionSkeleton />
}

export function OutputWorkspacePanel({ projectId, className }: OutputWorkspacePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)

  const hasOutput = Boolean(hook?.trim() || script?.trim() || scenes.length > 0)
  const isHydrating =
    Boolean(projectId) &&
    !hasOutput &&
    !isGenerating &&
    savedProjectId !== projectId

  if (!hasOutput && !isHydrating && !projectId) return null

  return (
    <RewriteProvider containerRef={containerRef}>
      <div
        ref={containerRef}
        className={cn('space-y-4 pt-2 border-t border-white/[0.06]', className)}
        aria-label="Output workspace"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-[9px] tracking-[0.24em] uppercase text-gold-300/70">
              Output workspace
            </p>
            <p className="text-[11px] text-luxe/50 mt-0.5 italic">
              From generation to execution — copy, refine, export.
            </p>
          </div>
          <PlatformModeToggle />
        </div>

        <ContentReadinessTracker />
        <QuickCreatorActions compact />

        <Suspense fallback={<SectionFallback />}>
          <HookSection loading={isHydrating} />
        </Suspense>

        <Suspense fallback={<SectionFallback />}>
          <ScriptSection loading={isHydrating} />
        </Suspense>

        <Suspense fallback={<SectionFallback />}>
          <StoryboardSection loading={isHydrating} />
        </Suspense>

        <Suspense fallback={<SectionFallback />}>
          <CaptionSection loading={isHydrating} />
        </Suspense>

        <Suspense fallback={<SectionFallback />}>
          <ThumbnailSection loading={isHydrating} />
        </Suspense>

        <ExportHub />
      </div>
    </RewriteProvider>
  )
}
