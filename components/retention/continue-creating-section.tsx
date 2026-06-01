'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowRight, Clock3, Film, Loader2, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { loadRecentProjects } from '@/lib/cinematic-projects'
import { commandCenterWorkspaceHref, STUDIO } from '@/lib/create/routes'
import {
  summaryToCard,
  type ProjectCardModel,
} from '@/components/create/unified-projects-grid'
import { markHasCreatedProject } from '@/lib/retention/returning-creator-state'

type ContinueCreatingSectionProps = {
  limit?: number
  className?: string
  onProjectsLoaded?: (count: number) => void
}

export function ContinueCreatingSection({
  limit = 6,
  className,
  onProjectsLoaded,
}: ContinueCreatingSectionProps) {
  const { ready, user } = useAuthHydration()
  const [projects, setProjects] = useState<ProjectCardModel[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ready || !user) {
      setProjects(null)
      onProjectsLoaded?.(0)
      return
    }

    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const { projects: rows } = await loadRecentProjects(limit)
        if (!alive) return
        const cards = rows.map((row) => summaryToCard(row))
        setProjects(cards)
        if (cards.length > 0) markHasCreatedProject()
        onProjectsLoaded?.(cards.length)
      } catch {
        if (alive) {
          setProjects([])
          onProjectsLoaded?.(0)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [ready, user, limit, onProjectsLoaded])

  if (!ready || !user) return null

  return (
    <section className={cn('space-y-4', className)} aria-label="Continue creating">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-400/70">
            Continue Creating
          </p>
          <p className="text-xs text-luxe/45 mt-0.5">Pick up where the lens left off</p>
        </div>
        <Link
          href={STUDIO.projects}
          className="text-[10px] tracking-[0.2em] uppercase text-gold-300/80 hover:text-gold-200 inline-flex items-center gap-1 transition-colors"
        >
          All projects <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-luxe/40 py-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading your projects…
        </div>
      ) : !projects?.length ? null : (
        <ul className="rounded-2xl border border-white/[0.06] bg-black/25 backdrop-blur-sm divide-y divide-white/[0.06] overflow-hidden">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-gold-500/[0.03] transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 text-gold-400/50">
                  {project.thumbnail ? (
                    <Image
                      src={project.thumbnail}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <Film className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#F4E7C1]/90 truncate">
                    {project.title || 'Untitled project'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-luxe/45">
                      <Clock3 className="w-3 h-3" />
                      {project.updatedAt
                        ? formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })
                        : 'Recently'}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-gold-500/20 text-[9px] text-gold-200/70"
                    >
                      {project.platform || 'Reel'}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                asChild
                className="shrink-0 h-8 rounded-lg bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 hover:text-gold-100"
              >
                <Link href={commandCenterWorkspaceHref(project.id)}>
                  <Play className="w-3 h-3" />
                  Continue
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
