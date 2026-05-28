'use client'

import { Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProjectGalleryFilter = 'all' | 'quick' | 'director' | 'downloaded'

export function ProjectsGalleryChrome({
  title,
  subtitle,
  search,
  onSearchChange,
  filter,
  onFilterChange,
}: {
  title: string
  subtitle?: string
  search: string
  onSearchChange: (v: string) => void
  filter: ProjectGalleryFilter
  onFilterChange: (v: ProjectGalleryFilter) => void
}) {
  const filters: { id: ProjectGalleryFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'quick', label: 'Quick Cut' },
    { id: 'director', label: 'Director Cut' },
    { id: 'downloaded', label: 'Downloaded' },
  ]

  return (
    <div className="mb-6 space-y-4">
      <div>
        <h2 className="font-display text-xl sm:text-2xl text-luxe">{title}</h2>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400/50" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search cinematic stories…"
            className={cn(
              'w-full h-10 pl-10 pr-3 rounded-xl text-sm',
              'bg-black/40 border border-white/[0.08] text-luxe',
              'focus:outline-none focus:border-gold-500/40 focus:shadow-[0_0_20px_-8px_rgba(212,175,55,0.35)]'
            )}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scroll-touch">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gold-400/60 shrink-0 hidden sm:block" />
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilterChange(f.id)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide border transition-all',
                filter === f.id
                  ? 'bg-gold-500/15 border-gold-500/35 text-gold-200'
                  : 'border-white/[0.06] text-muted-foreground hover:border-gold-500/25 hover:text-luxe'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
