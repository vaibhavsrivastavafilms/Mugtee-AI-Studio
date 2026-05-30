'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Clock3, Loader2 } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { loadRecentProjects } from '@/lib/cinematic-projects'
import { hrefForProject } from '@/lib/create/routes'
import {
  summaryToCard,
  type ProjectCardModel,
} from '@/components/create/unified-projects-grid'
import { readLastWorkspace } from '@/lib/last-workspace'

export function RecentProjectsRail({ limit = 5 }: { limit?: number }) {
  const { ready, user } = useAuthHydration()
  const [projects, setProjects] = useState<ProjectCardModel[] | null>(null)
  const [loading, setLoading] = useState(false)
  const lastWorkspace = typeof window !== 'undefined' ? readLastWorkspace() : null

  useEffect(() => {
    if (!ready || !user) {
      setProjects(null)
      return
    }

    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const { projects: rows } = await loadRecentProjects(limit)
        if (!alive) return
        setProjects(rows.map((row) => summaryToCard(row)))
      } catch {
        if (alive) setProjects([])
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [ready, user, limit])

  if (!ready || !user) return null

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative z-20 border-t border-white/[0.06] bg-black/30 backdrop-blur-sm"
    >
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] tracking-[0.28em] uppercase text-gold-400/70">
              Recent Projects
            </p>
            {lastWorkspace?.title ? (
              <p className="text-xs text-luxe/45 mt-0.5 truncate max-w-[240px]">
                Last opened: {lastWorkspace.title}
              </p>
            ) : null}
          </div>
          <Link
            href="/projects"
            className="text-[10px] tracking-[0.2em] uppercase text-gold-300/80 hover:text-gold-200 inline-flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-luxe/40 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading projects…
          </div>
        ) : !projects?.length ? (
          <p className="text-xs text-luxe/40 py-1">No saved projects yet — pick a mode above to start.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto scroll-touch snap-x snap-mandatory pb-1 -mx-1 px-1">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={hrefForProject(project.status, project.id, project.mode)}
                className={cn(
                  'group shrink-0 snap-start w-[min(240px,72vw)] rounded-xl border border-white/[0.08]',
                  'bg-white/[0.02] hover:border-gold-500/30 hover:bg-gold-500/[0.04]',
                  'p-3 transition-all duration-300'
                )}
              >
                <div className="flex items-center gap-2 text-[10px] text-luxe/40 mb-2">
                  <Clock3 className="w-3 h-3" />
                  {project.updatedAt
                    ? formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })
                    : 'Recently'}
                  <span className="ml-auto uppercase tracking-wider text-gold-400/60">
                    {project.mode === 'quick' ? 'Quick' : 'Director'}
                  </span>
                </div>
                <p className="text-sm text-luxe/85 line-clamp-2 group-hover:text-luxe transition-colors">
                  {project.title || 'Untitled project'}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[9px] tracking-[0.18em] uppercase text-gold-300/70 opacity-0 group-hover:opacity-100 transition-opacity">
                  Resume <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  )
}
