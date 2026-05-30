'use client'

import { Suspense } from 'react'
import { AppBootstrap } from '@/components/app/app-bootstrap'
import { ExitFeedbackProvider } from '@/components/creator/exit-feedback-provider'

export function AppBootstrapProvider({ children }: { children: React.ReactNode }) {
  return (
    <ExitFeedbackProvider>
      <Suspense fallback={null}>
        <AppBootstrap>{children}</AppBootstrap>
      </Suspense>
    </ExitFeedbackProvider>
  )
}
