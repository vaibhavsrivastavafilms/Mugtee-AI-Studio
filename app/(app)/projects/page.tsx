'use client'

import { Suspense } from 'react'
import { UnifiedProjectsLibrary } from '@/components/projects/unified-projects-library'
import { V2PageShell } from '@/components/v2/v2-page-shell'
import { LuxFooter } from '@/components/v2/lux-footer'
import { PageLoadingSkeleton } from '@/components/ui/page-loading-skeleton'

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <V2PageShell>
          <PageLoadingSkeleton variant="grid" className="py-8" />
        </V2PageShell>
      }
    >
      <V2PageShell className="pb-0">
        <header className="mb-8 sm:mb-10">
          <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-2">
            Library
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
            Your projects
          </h1>
          <p className="mt-3 text-sm text-[var(--v2-text-secondary)] max-w-2xl">
            Every Studio production, Quick Cut, cinematic project, and legacy pipeline — running,
            paused, failed, or completed.
          </p>
        </header>

        <UnifiedProjectsLibrary />
      </V2PageShell>
      <LuxFooter />
    </Suspense>
  )
}
