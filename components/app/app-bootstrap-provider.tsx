'use client'

import { Suspense } from 'react'
import { AppBootstrap } from '@/components/app/app-bootstrap'

export function AppBootstrapProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppBootstrap>{children}</AppBootstrap>
    </Suspense>
  )
}
