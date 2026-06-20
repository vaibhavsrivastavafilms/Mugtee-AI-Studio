'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RemoteImage } from '@/components/ui/remote-image'
import { motion } from 'framer-motion'
import { ArrowRight, Clock3, Film, Loader2, Play } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { loadRecentProjects } from '@/lib/cinematic-projects'
import { hrefForProject } from '@/lib/create/routes'
import {
  summaryToCard,
  type ProjectCardModel,
} from '@/components/create/unified-projects-grid'
import {
  completionLabel,
  projectCompletionPercent,
} from '@/lib/creator/project-completion'

export function ContinueCreatingWidget({ limit = 8 }: { limit?: number }) {
  const { ready, user } = useAuthHydration()
  const [projects, setProjects] = useState<ProjectCardModel[] | null>(null)
  const [loading, setLoading] = useState(false)

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
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-400/70">
            Continue Creating
          </p>
          <p className="text-xs text-luxe/45 mt-0.5">Pick up where the lens left off</p>
        </div>
        <Link
          href="/studio/projects"
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
      ) : !projects?.length ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <Film className="w-8 h-8 text-gold-400/40 mx-auto mb-3" />
          <p className="text-sm text-luxe/60">No projects yet — start with today&apos;s prompt above.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scroll-touch snap-x snap-mandatory pb-2 -mx-1 px-1">
          {projects.map((project, i) => {
            const percent = projectCompletionPercent(project.status)
            const resumeHref = hrefForProject(project.status, project.id, project.mode)

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className={cn(
                  'group shrink-0 snap-start w-[min(260px,78vw)] rounded-xl border border-white/[0.08]',
                  'bg-white/[0.02] hover:border-gold-500/30 hover:bg-gold-500/[0.04]',
                  'overflow-hidden transition-all duration-300'
                )}
              >
                <div className="relative aspect-video bg-black/50">
                  {project.thumbnail ? (
                    <RemoteImage
                      src={project.thumbnail}
                      alt=""
                      fill
                      sizes="260px"
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="w-8 h-8 text-gold-400/25" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gold-gradient transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-[9px] tracking-wider uppercase text-gold-300/70 mt-1">
                      {completionLabel(percent)} · {percent}%
                    </p>
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-2 text-[10px] text-luxe/40 mb-1.5">
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
                  <Link
                    href={resumeHref}
                    className="mt-3 inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300 hover:text-gold-100 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Resume
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </section>
  )
}
