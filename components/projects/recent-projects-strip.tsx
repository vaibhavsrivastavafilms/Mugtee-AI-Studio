'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowRight, Clapperboard, Loader2 } from 'lucide-react'
import { RemoteImage } from '@/components/ui/remote-image'
import { cn } from '@/lib/utils'
import type { UnifiedLibraryResponse, UnifiedProjectItem } from '@/lib/projects/unified-library.types'

const RECENT_LIMIT = 6
const LIVE_POLL_MS = 10_000

type AuthState = 'loading' | 'anonymous' | 'authenticated'

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
    default:
      return 'border-white/10 bg-white/5 text-white/60'
  }
}

function displayStatusLabel(project: UnifiedProjectItem): string {
  if (project.status === 'running' && project.currentStage) {
    return project.currentStage.toUpperCase()
  }
  return project.statusLabel.toUpperCase()
}

function secondaryLine(project: UnifiedProjectItem): string | null {
  if (project.status === 'paused' && project.pausedReason) {
    return project.pausedDetail ?? project.pausedReason
  }
  if (project.status === 'completed' && project.durationLabel) {
    return project.durationLabel
  }
  if (project.sceneProgressLabel) {
    return project.sceneProgressLabel
  }
  if (project.currentTask && project.status === 'running') {
    return project.currentTask
  }
  return null
}

function StudioRecentProjectCard({ project }: { project: UnifiedProjectItem }) {
  const secondary = secondaryLine(project)
  const showProgress = project.status !== 'completed' && project.progress > 0

  return (
    <Link
      href={project.route}
      className="group flex min-h-[44px] w-[260px] max-w-[85vw] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 active:border-[#D4AF37]/30 sm:w-[280px]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-900">
        {project.thumbnailUrl ? (
          <RemoteImage
            src={project.thumbnailUrl}
            alt={project.title}
            fill
            className="object-cover"
            sizes="280px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
            <Clapperboard className="h-8 w-8 text-[#D4AF37]/35" />
          </div>
        )}
        <span
          className={cn(
            'absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide',
            statusTone(project.status)
          )}
        >
          {displayStatusLabel(project)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm text-white">{project.title}</p>
          <p className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-white/40">
            {project.typeLabel}
          </p>
        </div>

        {secondary ? (
          <p className="line-clamp-2 text-xs text-white/55">{secondary}</p>
        ) : null}

        {showProgress ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-white/45">
              <span>{project.progress}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#D4AF37]/80 to-amber-300/70 transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
              />
            </div>
          </div>
        ) : null}

        <p className="mt-auto text-[10px] text-white/40">
          {formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })}
        </p>
      </div>
    </Link>
  )
}

export function RecentProjectsStrip({
  className,
  refreshToken = 0,
  studioOnly = false,
}: {
  className?: string
  refreshToken?: number
  /** When true, only V7 Studio productions (newest first). */
  studioOnly?: boolean
}) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<UnifiedProjectItem[]>([])
  const inFlightRef = useRef<AbortController | null>(null)

  const hasRunning = useMemo(
    () => projects.some((project) => project.status === 'running'),
    [projects]
  )

  const loadProjects = useCallback(async (options?: { silent?: boolean }) => {
    inFlightRef.current?.abort()
    const controller = new AbortController()
    inFlightRef.current = controller

    if (!options?.silent) setLoading(true)

    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: String(RECENT_LIMIT),
        sort: studioOnly ? 'newest' : 'recently_updated',
      })
      if (studioOnly) params.set('pipeline', 'v7')

      const res = await fetch(`/api/projects/library?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      if (res.status === 401) {
        setAuthState('anonymous')
        setProjects([])
        return
      }

      if (res.status === 503) {
        if (!options?.silent) {
          setProjects([])
        }
        return
      }

      const data = (await res.json()) as UnifiedLibraryResponse & { error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Failed to load projects')
      }

      setAuthState('authenticated')
      setProjects(data.projects.slice(0, RECENT_LIMIT))
    } catch (err) {
      if (controller.signal.aborted) return
      if (!options?.silent) {
        setProjects([])
      }
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null
      }
      if (!options?.silent && !controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [studioOnly])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects, refreshToken])

  useEffect(() => {
    if (!hasRunning || authState !== 'authenticated') return

    const timer = window.setInterval(() => {
      void loadProjects({ silent: true })
    }, LIVE_POLL_MS)

    return () => window.clearInterval(timer)
  }, [authState, hasRunning, loadProjects])

  if (authState === 'anonymous') return null

  if (loading) {
    return (
      <section className={cn('w-full overflow-x-hidden', className)} aria-label="Recent projects">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium tracking-[0.12em] uppercase text-white/55">
            Recent projects
          </h2>
        </div>
        <div className="flex min-h-[120px] items-center justify-center text-sm text-white/40">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading recent projects…
        </div>
      </section>
    )
  }

  return (
    <section className={cn('w-full overflow-x-hidden', className)} aria-label="Recent projects">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium tracking-[0.12em] uppercase text-white/55">
          Recent projects
        </h2>
        <Link
          href="/projects"
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 text-sm text-[#D4AF37]/80 transition active:text-[#E6C76A]"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-white/40">
          No Studio projects yet.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {projects.map((project) => (
            <StudioRecentProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  )
}
