'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreatorCommandCenter } from '@/components/studio/creator-command-center'
import { DirectorModeShell } from '@/components/studio/director-mode-shell'
import { DirectorStudioWorkflow } from '@/components/studio/director-studio-workflow'
import { isDirectorStudioV2Enabled } from '@/lib/director/feature-flag'
import { storeCreatorMode } from '@/lib/create/mode-selection'

function DirectorModePageInner() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') ?? undefined

  useEffect(() => {
    storeCreatorMode('director')
  }, [])

  const studioV2 = isDirectorStudioV2Enabled()

  return (
    <DirectorModeShell projectId={projectId}>
      {studioV2 ? (
        <DirectorStudioWorkflow projectId={projectId} />
      ) : (
        <CreatorCommandCenter projectId={projectId} />
      )}
    </DirectorModeShell>
  )
}

export default function DirectorModePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Opening Director Mode…
        </div>
      }
    >
      <DirectorModePageInner />
    </Suspense>
  )
}
