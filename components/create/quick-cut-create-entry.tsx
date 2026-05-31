'use client'

import { Suspense } from 'react'
import { QuickCutCreator } from '@/components/create/quick-cut-creator'
import { CreatorWelcomeModal } from '@/components/onboarding/creator-welcome-modal'
import { useQuickCutFreshCreateEntry } from '@/hooks/use-quick-cut-fresh-create-entry'

function QuickCutCreateEntryInner() {
  useQuickCutFreshCreateEntry()

  return (
    <div className="-mx-3 sm:-mx-5 lg:-mx-6 -my-4 sm:-my-5 lg:-my-6 min-h-[calc(100dvh-4rem)] min-w-0 overflow-x-hidden">
      <CreatorWelcomeModal inlineCreate />
      <QuickCutCreator />
    </div>
  )
}

/** Quick Cut on bare create route — always starts fresh (no preview/session restore). */
export function QuickCutCreateEntry() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Opening Quick Cut…
        </div>
      }
    >
      <QuickCutCreateEntryInner />
    </Suspense>
  )
}
