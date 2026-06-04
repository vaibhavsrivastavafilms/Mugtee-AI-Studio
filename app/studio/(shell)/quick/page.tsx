'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { QuickModeShell } from '@/components/studio/quick-mode-shell'
import { QuickModeWorkspace } from '@/components/studio/quick-mode-workspace'
import { CreatorWelcomeModal } from '@/components/onboarding/creator-welcome-modal'
import { storeCreatorMode } from '@/lib/create/mode-selection'

function QuickModePageInner() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('project') ?? undefined

  useEffect(() => {
    storeCreatorMode('quick')
  }, [])

  return (
    <QuickModeShell projectId={projectId}>
      <CreatorWelcomeModal inlineCreate />
      <QuickModeWorkspace />
    </QuickModeShell>
  )
}

export default function QuickModePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Opening Quick Mode…
        </div>
      }
    >
      <QuickModePageInner />
    </Suspense>
  )
}
