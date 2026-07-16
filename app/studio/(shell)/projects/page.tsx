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
          <header className="mb-5 rounded-3xl border border-gold-500/15 bg-black/30 p-5 shadow-[0_0_50px_-34px_rgba(212,175,55,0.75)]">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold-300/70">
              Conversations
            </p>
            <h1 className="mt-2 font-display text-2xl text-luxe sm:text-3xl">
              Every project is something you and Mugtee started together.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-luxe/55">
              Come back to unfinished ideas, client stories, travel memories, and the little worlds
              Mugtee still remembers.
            </p>
          </header>
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
