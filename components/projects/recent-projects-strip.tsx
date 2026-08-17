'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  ProjectLibraryCard,
  ProjectLibraryCardSkeleton,
} from '@/components/projects/project-library-card'
import { cn } from '@/lib/utils'
import type { UnifiedLibraryResponse, UnifiedProjectItem } from '@/lib/projects/unified-library.types'

const RECENT_LIMIT = 6
const LIVE_POLL_MS = 10_000

type AuthState = 'loading' | 'anonymous' | 'authenticated'

export function RecentProjectsStrip({
  className,
  refreshToken = 0,
  studioOnly = false,
}: {
  className?: string
  refreshToken?: number
  studioOnly?: boolean
}) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<UnifiedProjectItem[]>([])
  const inFlightRef = useRef<AbortController | null>(null)
  const pollInFlightRef = useRef(false)

  const hasRunning = useMemo(
    () => projects.some((project) => project.status === 'running'),
    [projects]
  )

  const loadProjects = useCallback(
    async (options?: { silent?: boolean }) => {
      if (pollInFlightRef.current && options?.silent) return

      inFlightRef.current?.abort()
      const controller = new AbortController()
      inFlightRef.current = controller
      pollInFlightRef.current = true

      if (!options?.silent) setLoading(true)

      try {
        const params = new URLSearchParams({
          page: '1',
          pageSize: String(RECENT_LIMIT),
          sort: 'newest',
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
          if (!options?.silent) setProjects([])
          return
        }

        const data = (await res.json()) as UnifiedLibraryResponse & { error?: string }
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? 'Failed to load projects')
        }

        setAuthState('authenticated')
        setProjects(data.projects.slice(0, RECENT_LIMIT))
      } catch {
        if (controller.signal.aborted) return
        if (!options?.silent) setProjects([])
      } finally {
        if (inFlightRef.current === controller) {
          inFlightRef.current = null
        }
        pollInFlightRef.current = false
        if (!options?.silent && !controller.signal.aborted) {
          setLoading(false)
        }
      }
    },
    [studioOnly]
  )

  useEffect(() => {
    void loadProjects()
  }, [loadProjects, refreshToken])

  useEffect(() => {
    return () => {
      inFlightRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!hasRunning || authState !== 'authenticated') return

    const timer = window.setInterval(() => {
      void loadProjects({ silent: true })
    }, LIVE_POLL_MS)

    return () => window.clearInterval(timer)
  }, [authState, hasRunning, loadProjects])

  if (authState === 'anonymous') return null

  return (
    <section className={cn('w-full overflow-x-hidden', className)} aria-label="Recent projects">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4AF37]/70">Projects</p>
          <h2 className="mt-1 text-lg font-medium text-white">Recent projects</h2>
        </div>
        <Link
          href="/studio/projects"
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 text-sm text-[#D4AF37]/80 transition active:text-[#E6C76A]"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProjectLibraryCardSkeleton key={index} variant="recent" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
          <p className="text-sm text-white/55">Start your first production.</p>
          <Link
            href="/studio"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#D4AF37]/30 px-5 text-sm font-medium text-[#E6C76A]"
          >
            Create a Video
          </Link>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {projects.map((project) => (
            <div key={project.id} className="w-[280px] max-w-[85vw] shrink-0 snap-start">
              <ProjectLibraryCard project={project} variant="recent" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
