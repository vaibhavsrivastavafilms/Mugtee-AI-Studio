'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search } from 'lucide-react'
import {
  ProjectLibraryCard,
  ProjectLibraryCardSkeleton,
} from '@/components/projects/project-library-card'
import { cn } from '@/lib/utils'
import type {
  UnifiedLibraryResponse,
  UnifiedLibrarySort,
  UnifiedLibraryStatusFilter,
  UnifiedProjectItem,
} from '@/lib/projects/unified-library.types'

const STATUS_FILTERS: { id: UnifiedLibraryStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'failed', label: 'Failed' },
  { id: 'closed', label: 'Closed' },
]

const SORT_OPTIONS: { id: UnifiedLibrarySort; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'recently_updated', label: 'Recently updated' },
  { id: 'name_asc', label: 'Name A–Z' },
]

const LIVE_POLL_MS = 10_000

export function StudioProjectLibrary() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<UnifiedLibraryStatusFilter>('all')
  const [sort, setSort] = useState<UnifiedLibrarySort>('newest')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<UnifiedLibraryResponse | null>(null)
  const [projects, setProjects] = useState<UnifiedProjectItem[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, sort])

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '20',
      pipeline: 'v7',
      sort,
    })
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (status !== 'all') params.set('status', status)
    return params.toString()
  }, [debouncedSearch, page, sort, status])

  const hasRunning = useMemo(
    () => projects.some((project) => project.status === 'running'),
    [projects]
  )

  const loadLibrary = useCallback(
    async (options?: { silent?: boolean }) => {
      const isFirstPage = page === 1
      if (isFirstPage && !options?.silent) setLoading(true)
      else if (!options?.silent) setLoadingMore(true)
      if (!options?.silent) setError(null)

      try {
        const res = await fetch(`/api/projects/library?${queryString}`, { cache: 'no-store' })
        if (res.status === 401) {
          setError('Sign in to view your project library.')
          setProjects([])
          return
        }
        const data = (await res.json()) as UnifiedLibraryResponse & { error?: string }
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? 'Failed to load projects')
        }

        setPayload(data)
        setProjects((current) => (page === 1 ? data.projects : [...current, ...data.projects]))
      } catch (err) {
        if (!options?.silent) {
          setError('Unable to load your projects.')
          if (page === 1) setProjects([])
        }
      } finally {
        if (!options?.silent) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [page, queryString]
  )

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  useEffect(() => {
    if (!hasRunning) return
    const timer = window.setInterval(() => {
      void loadLibrary({ silent: true })
    }, LIVE_POLL_MS)
    return () => window.clearInterval(timer)
  }, [hasRunning, loadLibrary])

  const hasMore = payload?.hasMore ?? false
  const total = payload?.total ?? projects.length

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D4AF37]/50" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-black/40 pl-10 pr-3 text-sm text-white focus:border-[#D4AF37]/40 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatus(filter.id)}
                className={cn(
                  'min-h-[44px] rounded-full border px-4 text-sm transition',
                  status === filter.id
                    ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#E6C76A]'
                    : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as UnifiedLibrarySort)}
            aria-label="Sort projects"
            className="min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-sm text-white focus:border-[#D4AF37]/40 focus:outline-none lg:w-[220px]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-zinc-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-4 text-center">
          <p className="text-sm text-red-200/90">{error}</p>
          <button
            type="button"
            onClick={() => void loadLibrary()}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm text-white/90"
          >
            Try again
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProjectLibraryCardSkeleton key={index} />
          ))}
        </div>
      ) : projects.length === 0 && !error ? (
        <div className="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-display text-xl text-white">Your creations will appear here.</p>
          <p className="mt-2 text-sm text-white/55">Create your first cinematic video.</p>
          <Link
            href="/studio"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#D4AF37] px-6 text-sm font-semibold text-[#0B0B0B]"
          >
            Create a Video
          </Link>
        </div>
      ) : !error ? (
        <>
          <p className="text-sm text-white/50">
            Showing {projects.length} of {total} project{total === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectLibraryCard key={project.id} project={project} />
            ))}
          </div>
          {hasMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm text-white/90 hover:bg-white/[0.08] disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
