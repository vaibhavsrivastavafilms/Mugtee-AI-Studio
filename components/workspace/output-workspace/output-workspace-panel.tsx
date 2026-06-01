'use client'

import Link from 'next/link'
import { lazy, Suspense, useRef } from 'react'
import { Clapperboard } from 'lucide-react'
import { RewriteProvider } from '@/components/director/rewrite-provider'
import { ExportHub } from '@/components/workspace/export-hub'
import { PlatformModeToggle } from '@/components/workspace/platform-mode-toggle'
import { QuickCreatorActions } from '@/components/workspace/quick-creator-actions'
import { WorkspaceSectionSkeleton } from '@/components/workspace/output-workspace/workspace-section-shell'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { cn } from '@/lib/utils'

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
        aria-label="Export workspace"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-[9px] tracking-[0.24em] uppercase text-gold-300/70">
              Export workspace
            </p>
            <p className="text-[11px] text-luxe/50 mt-0.5 italic">
              Captions, thumbnails, and platform exports — hook, script, and scenes live above.
            </p>
          </div>
          <PlatformModeToggle />
        </div>

        {scenes.length > 0 && savedProjectId ? (
          <Link
            href={`/studio/editor?project=${encodeURIComponent(savedProjectId)}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-[11px] text-gold-100 hover:bg-gold-500/20 transition w-fit"
          >
            <Clapperboard className="h-3.5 w-3.5" />
            Open Timeline Editor
          </Link>
        ) : null}
        <QuickCreatorActions compact />

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
