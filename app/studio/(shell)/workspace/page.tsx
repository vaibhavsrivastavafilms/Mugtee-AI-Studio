'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreatorCommandCenter } from '@/components/studio/creator-command-center'
import { PageLoadingSkeleton } from '@/components/ui/page-loading-skeleton'
import { SessionContinuityGuard } from '@/components/trust/session-continuity-guard'
import { MobileSaveTrustBar } from '@/components/trust/mobile-save-trust-bar'

function WorkspacePageInner() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') ?? undefined

  return (
    <div className="-mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6 min-w-0 overflow-x-hidden flex flex-col">
      <SessionContinuityGuard projectId={projectId} />
      <MobileSaveTrustBar />
      <CreatorCommandCenter projectId={projectId} />
    </div>
  )
}

export default function StudioWorkspacePage() {
  return (
    <Suspense
      fallback={<PageLoadingSkeleton className="p-6 sm:p-8 min-h-[40vh]" />}
    >
      <WorkspacePageInner />
    </Suspense>
  )
}
