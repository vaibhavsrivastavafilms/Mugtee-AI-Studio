'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { QuickCutV2CreatePage } from '@/components/quick-cut/v2'
import { QC_V2 } from '@/lib/quick-cut/quick-cut-v2-design'
import { quickCutProjectHref } from '@/lib/create/routes'
import { useQuickCutFreshCreateEntry } from '@/hooks/use-quick-cut-fresh-create-entry'

function QuickModeWorkspaceInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = searchParams?.get('project') ?? undefined
  const topicParam = searchParams?.get('topic') ?? searchParams?.get('prompt') ?? ''

  useQuickCutFreshCreateEntry()

  useEffect(() => {
    if (projectId) {
      router.replace(quickCutProjectHref(projectId))
    }
  }, [projectId, router])

  if (projectId) {
    return (
      <div
        className="min-h-[40vh] flex items-center justify-center text-sm text-white/55 italic"
        style={{ backgroundColor: QC_V2.bg }}
      >
        Opening your project…
      </div>
    )
  }

  return <QuickCutV2CreatePage initialPrompt={topicParam} />
}

export function QuickModeWorkspace() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-[40vh] flex items-center justify-center text-sm text-white/55 italic"
          style={{ backgroundColor: QC_V2.bg }}
        >
          Loading Quick Cut…
        </div>
      }
    >
      <QuickModeWorkspaceInner />
    </Suspense>
  )
}
