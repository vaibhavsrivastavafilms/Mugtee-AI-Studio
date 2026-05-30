'use client'

import { useMemo, useState } from 'react'
import { UnifiedProjectsGrid, type ProjectCardModel } from '@/components/create/unified-projects-grid'
import {
  ProjectSearchEmptyState,
  ProjectSearchToolbar,
} from '@/components/create/project-search-toolbar'
import { filterAndSortProjects } from '@/lib/project-search-filter'
import type { ProjectCategoryFilter, ProjectSortOrder } from '@/lib/project-search-filter'
import { useProjectLibrary } from '@/hooks/use-project-library'
import { ProjectLibraryEmpty } from '@/components/showcase/project-library-empty'
import { DatabaseMigrationBanner } from '@/components/app/database-migration-banner'

export function ProjectsLibrarySection({
  limit = 24,
  showActions = true,
  galleryMode = true,
  selectedId = null,
  onSelectProject,
}: {
  limit?: number
  showActions?: boolean
  galleryMode?: boolean
  selectedId?: string | null
  onSelectProject?: (project: ProjectCardModel | null) => void
}) {
  const { projects, loading, tableUnavailable, setProjects } = useProjectLibrary(limit)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ProjectCategoryFilter>('all')
  const [sort, setSort] = useState<ProjectSortOrder>('recently_edited')

  const visibleProjects = useMemo(() => {
    if (!projects) return null
    return filterAndSortProjects(projects, { search, category, sort })
  }, [projects, search, category, sort])

  const clearFilters = () => {
    setSearch('')
    setCategory('all')
    setSort('recently_edited')
  }

  if (tableUnavailable && !loading) {
    return (
      <div className="space-y-4">
        <DatabaseMigrationBanner />
        <ProjectLibraryEmpty />
      </div>
    )
  }

  return (
    <>
      <ProjectSearchToolbar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
      />

      {!loading && projects && projects.length > 0 && visibleProjects?.length === 0 ? (
        <ProjectSearchEmptyState onClearFilters={clearFilters} />
      ) : (
        <UnifiedProjectsGrid
          limit={limit}
          showActions={showActions}
          galleryMode={galleryMode}
          projects={visibleProjects}
          loading={loading}
          tableUnavailable={tableUnavailable}
          selectedId={selectedId}
          onSelectProject={onSelectProject}
          onProjectsChange={setProjects}
        />
      )}
    </>
  )
}
