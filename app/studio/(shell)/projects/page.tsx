'use client'

import { Suspense, useState } from 'react'
import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'
import { UnifiedProjectsGrid, type ProjectCardModel } from '@/components/create/unified-projects-grid'
import { ProjectsInsightsPanel } from '@/components/create/projects-insights-panel'
import {
  ProjectsGalleryChrome,
  type ProjectGalleryFilter,
} from '@/components/create/projects-gallery-chrome'

function ProjectsDashboardInner() {
  const [gallerySearch, setGallerySearch] = useState('')
  const [galleryFilter, setGalleryFilter] = useState<ProjectGalleryFilter>('all')
  const [selectedProject, setSelectedProject] = useState<ProjectCardModel | null>(null)

  return (
    <UnifiedCreatorShell>
      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
        <div className="flex-1 min-w-0">
          <ProjectsGalleryChrome
            title="Projects"
            subtitle="Continue, preview, or refine any reel."
            search={gallerySearch}
            onSearchChange={setGallerySearch}
            filter={galleryFilter}
            onFilterChange={setGalleryFilter}
          />
          <UnifiedProjectsGrid
            limit={24}
            showActions
            galleryMode
            searchQuery={gallerySearch}
            galleryFilter={galleryFilter}
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
