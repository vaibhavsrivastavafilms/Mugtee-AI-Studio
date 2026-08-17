'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Clapperboard,
  Download,
  ExternalLink,
  Film,
  Loader2,
  Package,
  Play,
  RefreshCw,
  Search,
} from 'lucide-react'
import { RemoteImage } from '@/components/ui/remote-image'
import { V7ProductionDownloadButton } from '@/features/v7/components/production-download-button'
import { cn } from '@/lib/utils'
import type {
  UnifiedLibraryPipelineFilter,
  UnifiedLibraryResponse,
  UnifiedLibrarySort,
  UnifiedLibraryStatusFilter,
  UnifiedProjectItem,
} from '@/lib/projects/unified-library.types'

const STATUS_FILTERS: { id: UnifiedLibraryStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'running', label: 'Running' },
  { id: 'paused', label: 'Paused' },
  { id: 'failed', label: 'Failed' },
  { id: 'draft', label: 'Draft' },
]

const PIPELINE_FILTERS: { id: UnifiedLibraryPipelineFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'v7', label: 'V7' },
  { id: 'quick_cut', label: 'Quick Cut' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'v3', label: 'V3 / Legacy' },
]

const SORT_OPTIONS: { id: UnifiedLibrarySort; label: string }[] = [
  { id: 'recently_updated', label: 'Recently updated' },
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'name_asc', label: 'Name A–Z' },
  { id: 'recently_completed', label: 'Recently completed' },
]

function statusTone(status: UnifiedProjectItem['status']): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    case 'running':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-200'
    case 'paused':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-100'
    case 'failed':
      return 'border-red-500/30 bg-red-500/10 text-red-200'
    case 'draft':
      return 'border-white/10 bg-white/5 text-luxe/70'
    case 'closed':
      return 'border-white/15 bg-white/5 text-white/50'
    case 'cancelled':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-200'
    case 'updated':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    default:
      return 'border-white/10 bg-white/5 text-white/60'
  }
}

function pipelineIcon(type: UnifiedProjectItem['type']) {
  switch (type) {
    case 'v7':
      return Clapperboard
    case 'quick_cut':
      return Film
    default:
      return Film
  }
}

function ActionButton(props: {
  href?: string
  onClick?: () => void
  label: string
  icon: ReactNode
  variant?: 'primary' | 'ghost'
}) {
  const className = cn(
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition',
    props.variant === 'primary'
      ? 'bg-gold-gradient text-black shadow-gold-glow'
      : 'border border-white/10 bg-white/[0.04] text-luxe hover:bg-white/[0.08]'
  )

  if (props.href) {
    return (
      <Link href={props.href} className={className}>
        {props.icon}
        {props.label}
      </Link>
    )
  }

  return (
    <button type="button" onClick={props.onClick} className={className}>
      {props.icon}
      {props.label}
    </button>
  )
}

function UnifiedProjectCard({ project }: { project: UnifiedProjectItem }) {
  const Icon = pipelineIcon(project.type)

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-black/30 shadow-[0_0_40px_-28px_rgba(212,175,55,0.45)]">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-900">
        {project.thumbnailUrl ? (
          <RemoteImage
            src={project.thumbnailUrl}
            alt={project.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
            <Icon className="h-10 w-10 text-gold-400/40" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', statusTone(project.status))}>
            {project.statusLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] text-luxe/75">
            {project.typeLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <h2 className="font-display text-lg text-luxe line-clamp-2">{project.title}</h2>
          {project.prompt ? (
            <p className="mt-1 text-sm text-luxe/55 line-clamp-2">{project.prompt}</p>
          ) : null}
        </div>

        {project.currentStage ? (
          <div className="space-y-1 text-sm">
            <p className="text-luxe/80">{project.currentStage}</p>
            {project.currentTask ? <p className="text-luxe/55">{project.currentTask}</p> : null}
          </div>
        ) : null}

        {project.pausedReason ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90">
            <p>{project.pausedReason}</p>
            {project.pausedDetail ? <p className="mt-1 text-xs text-amber-100/70">{project.pausedDetail}</p> : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-luxe/55">
            <span>{project.progress}%</span>
            <span className="min-w-0 truncate">
              Created {formatDistanceToNow(parseISO(project.createdAt), { addSuffix: true })}
            </span>
            <span className="min-w-0 truncate">
              Updated {formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-500/80 to-amber-300/80 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
            />
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {project.actions.open ? (
            <ActionButton
              href={project.route}
              label={project.type === 'v7' ? 'Open Studio' : 'Open'}
              icon={<ExternalLink className="h-4 w-4" />}
              variant="primary"
            />
          ) : null}
          {project.actions.continue && project.route !== '#' ? (
            <ActionButton
              href={project.route}
              label="Continue"
              icon={<RefreshCw className="h-4 w-4" />}
            />
          ) : null}
          {project.actions.retry ? (
            <ActionButton
              href={project.route}
              label="Retry failed stage"
              icon={<RefreshCw className="h-4 w-4" />}
            />
          ) : null}
          {project.actions.watch && project.reelUrl ? (
            <ActionButton
              href={project.reelUrl}
              label="Watch"
              icon={<Play className="h-4 w-4" />}
            />
          ) : null}
          {project.actions.download && project.type === 'v7' ? (
            <V7ProductionDownloadButton
              productionId={project.id}
              title={project.title}
              compact
              label="Download"
            />
          ) : null}
          {project.actions.download && project.type !== 'v7' && project.reelUrl ? (
            <ActionButton
              href={project.reelUrl}
              label="Download"
              icon={<Download className="h-4 w-4" />}
            />
          ) : null}
          {project.actions.downloadMov && project.movUrl ? (
            <ActionButton
              href={project.movUrl}
              label="Download MOV"
              icon={<Download className="h-4 w-4" />}
            />
          ) : null}
          {project.actions.creatorPack && project.creatorPackUrl ? (
            <ActionButton
              href={project.creatorPackUrl}
              label="Creator pack"
              icon={<Package className="h-4 w-4" />}
            />
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function UnifiedProjectsLibrary() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<UnifiedLibraryStatusFilter>('all')
  const [pipeline, setPipeline] = useState<UnifiedLibraryPipelineFilter>('all')
  const [sort, setSort] = useState<UnifiedLibrarySort>('recently_updated')
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
  }, [debouncedSearch, status, pipeline, sort])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', '20')
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (status !== 'all') params.set('status', status)
    if (pipeline !== 'all') params.set('pipeline', pipeline)
    if (sort !== 'recently_updated') params.set('sort', sort)
    return params.toString()
  }, [debouncedSearch, page, pipeline, sort, status])

  const loadLibrary = useCallback(async () => {
    const isFirstPage = page === 1
    if (isFirstPage) setLoading(true)
    else setLoadingMore(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/library?${queryString}`, { cache: 'no-store' })
      const data = (await res.json()) as UnifiedLibraryResponse & { error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Failed to load projects')
      }

      setPayload(data)
      setProjects((current) => (page === 1 ? data.projects : [...current, ...data.projects]))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
      if (page === 1) setProjects([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [page, queryString])

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary])

  const hasMore = payload?.hasMore ?? false
  const total = payload?.total ?? projects.length

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-400/50" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, prompt, or production ID"
            className="min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-black/40 pl-10 pr-3 text-sm text-luxe focus:border-gold-500/40 focus:outline-none"
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
                    ? 'border-gold-500/40 bg-gold-500/10 text-gold-100'
                    : 'border-white/10 bg-white/[0.03] text-luxe/70 hover:bg-white/[0.06]'
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
            className="min-h-[44px] w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-sm text-luxe focus:border-gold-500/40 focus:outline-none lg:w-[220px]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-zinc-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {PIPELINE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setPipeline(filter.id)}
              className={cn(
                'min-h-[44px] rounded-full border px-4 text-sm transition',
                pipeline === filter.id
                  ? 'border-gold-500/40 bg-gold-500/10 text-gold-100'
                  : 'border-white/10 bg-white/[0.03] text-luxe/70 hover:bg-white/[0.06]'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {payload?.sources.errors.length ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          Some sources could not be loaded. Showing available projects only.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center text-sm text-luxe/60">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-display text-xl text-luxe">Your projects will appear here.</p>
          <p className="mt-2 text-sm text-luxe/55">
            Start in Studio, Quick Cut, or Director Mode and every production will show up here.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-luxe/55">
            Showing {projects.length} of {total} project{total === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <UnifiedProjectCard key={`${project.type}-${project.id}`} project={project} />
            ))}
          </div>
          {hasMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm text-luxe hover:bg-white/[0.08] disabled:opacity-60"
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
      )}
    </div>
  )
}
