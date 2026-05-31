'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreatorCommandCenter } from '@/components/studio/creator-command-center'

function WorkspacePageInner() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') ?? undefined

  return (
    <div className="-mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6">
      <CreatorCommandCenter projectId={projectId} />
    </div>
  )
}

export default function StudioWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Opening Command Center…
        </div>
      }
    >
      <WorkspacePageInner />
    </Suspense>
  )
}
