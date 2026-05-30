'use client'

import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectCategoryFilter, ProjectSortOrder } from '@/lib/project-search-filter'

const CATEGORY_FILTERS: { id: ProjectCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'documentary', label: 'Documentary' },
  { id: 'business', label: 'Business' },
]

const SORT_OPTIONS: { id: ProjectSortOrder; label: string }[] = [
  { id: 'recently_edited', label: 'Recently Edited' },
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
]

export function ProjectSearchToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
}: {
  search: string
  onSearchChange: (value: string) => void
  category: ProjectCategoryFilter
  onCategoryChange: (value: ProjectCategoryFilter) => void
  sort: ProjectSortOrder
  onSortChange: (value: ProjectSortOrder) => void
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400/50" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search projects..."
            className={cn(
              'w-full h-10 pl-10 pr-3 rounded-xl text-sm',
              'bg-black/40 border border-white/[0.08] text-luxe',
              'focus:outline-none focus:border-gold-500/40 focus:shadow-[0_0_20px_-8px_rgba(212,175,55,0.35)]'
            )}
          />
        </div>

        <div className="relative shrink-0 w-full sm:w-auto">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ProjectSortOrder)}
            aria-label="Sort projects"
            className={cn(
              'w-full sm:w-[180px] h-10 appearance-none pl-3 pr-9 rounded-xl text-sm',
              'bg-black/40 border border-white/[0.08] text-luxe',
              'focus:outline-none focus:border-gold-500/40 focus:shadow-[0_0_20px_-8px_rgba(212,175,55,0.35)]'
            )}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-zinc-900">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400/50" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => onCategoryChange(filter.id)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide border transition-all',
              category === filter.id
                ? 'bg-gold-500/15 border-gold-500/35 text-gold-200'
                : 'border-white/[0.06] text-muted-foreground hover:border-gold-500/25 hover:text-luxe'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProjectSearchEmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="py-16 text-center space-y-4">
      <p className="text-sm text-muted-foreground">No matching projects found.</p>
      <button
        type="button"
        onClick={onClearFilters}
        className="inline-flex items-center px-4 py-2 rounded-xl text-xs tracking-[0.15em] uppercase border border-gold-500/30 bg-gold-500/10 text-gold-200 hover:bg-gold-500/20 hover:border-gold-500/45 transition"
      >
        Clear Filters
      </button>
    </div>
  )
}
