'use client'

import { Suspense, useState } from 'react'
import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'
import { UnifiedProjectsGrid, type ProjectCardModel } from '@/components/create/unified-projects-grid'
import { ProjectsInsightsPanel } from '@/components/create/projects-insights-panel'
import { ProjectsGalleryChrome } from '@/components/create/projects-gallery-chrome'

function ExportsDashboardInner() {
  const [gallerySearch, setGallerySearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<ProjectCardModel | null>(null)

  return (
    <UnifiedCreatorShell>
      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
        <div className="flex-1 min-w-0">
          <ProjectsGalleryChrome
            title="Exports"
            subtitle="Downloaded reels and finished outputs."
            search={gallerySearch}
            onSearchChange={setGallerySearch}
            filter="downloaded"
            onFilterChange={() => {}}
          />
          <UnifiedProjectsGrid
            limit={24}
            showActions
            galleryMode
            searchQuery={gallerySearch}
            galleryFilter="downloaded"
            selectedId={selectedProject?.id ?? null}
            onSelectProject={setSelectedProject}
          />
        </div>
        <ProjectsInsightsPanel project={selectedProject} className="xl:w-72 shrink-0" />
      </div>
    </UnifiedCreatorShell>
  )
}

export default function StudioExportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Loading exports…
        </div>
      }
    >
      <ExportsDashboardInner />
    </Suspense>
  )
}
