'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { QuickCutCreator } from '@/components/create/quick-cut-creator'
import { PageLoadingSkeleton } from '@/components/ui/page-loading-skeleton'
import { useQuickCutProjectHydration } from '@/hooks/use-quick-cut-project-hydration'

function GenerateInner() {
  const params = useParams()
  const projectId = params?.projectId as string
  useQuickCutProjectHydration(projectId)

  return (
    <div className="-mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6 min-h-[calc(100dvh-4rem)]">
      <QuickCutCreator />
    </div>
  )
}

export function GenerateCreatorPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton className="p-6 sm:p-8" />}>
      <GenerateInner />
    </Suspense>
  )
}

