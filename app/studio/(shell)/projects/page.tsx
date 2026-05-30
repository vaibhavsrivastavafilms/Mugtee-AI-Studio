'use client'

import { Suspense, useState } from 'react'
import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'
import { type ProjectCardModel } from '@/components/create/unified-projects-grid'
import { ProjectsInsightsPanel } from '@/components/create/projects-insights-panel'
import { ProjectsLibrarySection } from '@/components/create/projects-library-section'

function ProjectsDashboardInner() {
  const [selectedProject, setSelectedProject] = useState<ProjectCardModel | null>(null)

  return (
    <UnifiedCreatorShell>
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
    </UnifiedCreatorShell>
  )
}

export default function StudioProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Loading projects…
        </div>
      }
    >
      <ProjectsDashboardInner />
    </Suspense>
  )
}
