'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowRight, Clock, Film } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  cinematicHrefForProject,
  loadRecentProjects,
  type CinematicProjectSummary,
} from '@/lib/cinematic-projects'
import {
  deriveProjectCreationStatus,
  PROJECT_CREATION_STATUS_LABEL,
} from '@/lib/project-card-meta'
import {
  buildResumeHref,
  isProjectUnfinished,
  loadProjectContinuity,
  type CreatorProjectContinuity,
} from '@/lib/trust/project-continuity'

type ContinueTarget = {
  id: string
  title: string
  updatedAt: string
  href: string
  statusLabel: string
  source: 'continuity' | 'library'
}

function pickContinueTarget(
  continuity: CreatorProjectContinuity | null,
  projects: CinematicProjectSummary[]
): ContinueTarget | null {
  if (continuity && isProjectUnfinished(continuity)) {
    return {
      id: continuity.projectId,
      title: continuity.title,
      updatedAt: continuity.lastEditedAt,
      href: continuity.resumeHref,
      statusLabel: 'In progress',
      source: 'continuity',
    }
  }

  const unfinished = projects.filter((p) => {
    const status = deriveProjectCreationStatus({
      hook: p.hook,
      script: p.script,
      scenes: p.scenes,
      voice: p.voice,
      videoUrl: p.video_url,
      status: p.status,
    })
    return status !== 'ready_for_production'
  })

  const candidate = unfinished[0] ?? projects[0]
  if (!candidate) return null

  const creationStatus = deriveProjectCreationStatus({
    hook: candidate.hook,
    script: candidate.script,
    scenes: candidate.scenes,
    voice: candidate.voice,
    videoUrl: candidate.video_url,
    status: candidate.status,
  })

  return {
    id: candidate.id,
    title: candidate.title,
    updatedAt: candidate.updatedAt,
    href: buildResumeHref(candidate.id),
    statusLabel: PROJECT_CREATION_STATUS_LABEL[creationStatus],
    source: 'library',
  }
}

export function ContinueProjectCard({ className }: { className?: string }) {
  const [target, setTarget] = useState<ContinueTarget | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const continuity = loadProjectContinuity()
        const { projects } = await loadRecentProjects(12)
        if (!alive) return
        setTarget(pickContinueTarget(continuity, projects))
      } catch {
        if (alive) setTarget(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div
        className={cn(
          'h-[120px] rounded-2xl border border-white/[0.06] shimmer-cinematic',
          className
        )}
      />
    )
  }

  if (!target) return null

  const lastEdited = target.updatedAt
    ? formatDistanceToNow(parseISO(target.updatedAt), { addSuffix: true })
    : 'recently'

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={cn('space-y-3', className)}
      aria-label="Continue project"
    >
      <p className="text-[10px] tracking-[0.3em] uppercase text-gold-300">
        Pick up where you left off
      </p>
      <Link
        href={target.href}
        className={cn(
          'group block rounded-2xl border border-gold-500/30 overflow-hidden',
          'bg-gradient-to-br from-gold-500/[0.09] via-zinc-900/80 to-black/60',
          'hover:border-gold-500/45 transition-colors'
        )}
      >
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gold-500/25 bg-gold-500/[0.08]">
            <Film className="h-5 w-5 text-gold-300/80" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/75">
              Continue Project
            </p>
            <h2 className="font-display text-xl sm:text-2xl text-[#F4E7C1] truncate">
              {target.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-luxe/55 tracking-wide">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                Last edited {lastEdited}
              </span>
              <span className="text-gold-300/70">{target.statusLabel}</span>
            </div>
          </div>
          <span className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gold-gradient text-black text-[11px] font-semibold tracking-[0.12em] uppercase shadow-gold-glow shrink-0 group-hover:opacity-95 transition-opacity">
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </Link>
    </motion.section>
  )
}
