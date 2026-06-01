'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TimelineEditorShell } from '@/components/editor/timeline-editor-shell'
import { PageLoadingSkeleton } from '@/components/ui/page-loading-skeleton'

function EditorPageInner() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') ?? undefined

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <TimelineEditorShell projectId={projectId} />
    </div>
  )
}

export default function StudioTimelineEditorPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton className="min-h-[50vh] p-6" />}>
      <EditorPageInner />
    </Suspense>
  )
}
