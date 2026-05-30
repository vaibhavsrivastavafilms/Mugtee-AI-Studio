'use client'

import { Suspense, useState } from 'react'
import { type ProjectCardModel } from '@/components/create/unified-projects-grid'
import { ProjectsInsightsPanel } from '@/components/create/projects-insights-panel'
import { ProjectsLibrarySection } from '@/components/create/projects-library-section'
import { V2PageShell } from '@/components/v2/v2-page-shell'
import { LuxFooter } from '@/components/v2/lux-footer'

function ProjectsDashboardInner() {
  const [selectedProject, setSelectedProject] = useState<ProjectCardModel | null>(null)

  return (
    <>
      <header className="mb-8 sm:mb-10">
        <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-2">
          Library
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
          Your cinematic stories
        </h1>
        <p className="mt-3 text-sm text-[var(--v2-text-secondary)] max-w-2xl">
          Every AI generation auto-saves here — preview, download, or continue any reel.
        </p>
      </header>

      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
        <div className="flex-1 min-w-0">
          <ProjectsLibrarySection
            limit={24}
            showActions
            galleryMode
            selectedId={selectedProject?.id ?? null}
            onSelectProject={setSelectedProject}
          />
        </div>
        <ProjectsInsightsPanel project={selectedProject} className="xl:w-72 shrink-0" />
      </div>
    </>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-[var(--v2-text-secondary)] italic">
          Loading projects…
        </div>
      }
    >
      <V2PageShell className="pb-0">
        <ProjectsDashboardInner />
      </V2PageShell>
      <LuxFooter />
    </Suspense>
  )
}
