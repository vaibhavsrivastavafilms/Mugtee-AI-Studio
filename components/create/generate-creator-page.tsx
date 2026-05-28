'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { QuickCutCreator } from '@/components/create/quick-cut-creator'
import { useCreateProjectHydration } from '@/hooks/use-create-project-hydration'

function GenerateInner() {
  const params = useParams()
  const projectId = params?.projectId as string
  useCreateProjectHydration(projectId, 'preview')

  return (
    <div className="-mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6 min-h-[calc(100dvh-4rem)]">
      <QuickCutCreator />
    </div>
  )
}

export function GenerateCreatorPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground italic p-8">Loading…</div>}>
      <GenerateInner />
    </Suspense>
  )
}
