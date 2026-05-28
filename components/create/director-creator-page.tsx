'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { CinematicCreateScreen } from '@/components/cinematic/screens/create-screen'
import { useCreateProjectHydration } from '@/hooks/use-create-project-hydration'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'
import { DirectorCutLockedPage } from '@/components/mugtee-portal/director-cut-locked-page'

function DirectorInner() {
  const params = useParams()
  const projectId = params?.projectId as string
  useCreateProjectHydration(projectId, 'create')

  return <CinematicCreateScreen />
}

export function DirectorCreatorPage() {
  if (isDirectorCutLocked) {
    return <DirectorCutLockedPage showBack />
  }

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground italic p-8">Loading…</div>}>
      <DirectorInner />
    </Suspense>
  )
}
