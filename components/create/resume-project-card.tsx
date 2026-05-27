'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowRight, Clock, Film } from 'lucide-react'
import {
  cinematicHrefForProject,
  type CinematicProjectSummary,
} from '@/lib/cinematic-projects'
import { getDirectedContinuityLine } from '@/lib/creator/momentum-lines'
import { getReturnEnergyLine } from '@/lib/creator/return-energy'
import { getAtmosphereMemoryLine } from '@/lib/creator/operating-presence-copy'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  create: 'Story idea',
  generating: 'Generating',
  preview: 'Preview',
  director: 'Director',
  scenes: 'Storyboard',
  voiceover: 'Voice',
  compile: 'Export',
  complete: 'Complete',
}

const STATUS_TONE: Record<string, string> = {
  create: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
  generating: 'bg-blue-500/15 border-blue-500/30 text-blue-200',
  preview: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200',
  director: 'bg-purple-500/15 border-purple-500/30 text-purple-200',
  scenes: 'bg-pink-500/15 border-pink-500/30 text-pink-200',
  voiceover: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200',
  compile: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
}

export function ResumeProjectCard({ project }: { project: CinematicProjectSummary }) {
  const href = cinematicHrefForProject(project.status, project.id)
  const statusCls =
    STATUS_TONE[project.status] ?? 'bg-white/[0.05] border-white/[0.1] text-luxe/70'
  const returnLine = useMemo(
    () => getReturnEnergyLine(project.status, project.title.length % 3),
    [project.status, project.title]
  )
  const continuityLine = useMemo(
    () => getDirectedContinuityLine(project.status, project.style, project.title.length % 2),
    [project.status, project.style, project.title]
  )
  const atmosphereLine = useMemo(
    () => getAtmosphereMemoryLine(project.style, null),
    [project.style]
  )

  return (
    <Link
      href={href}
      className="resume-card-enter group block rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#2B1A08]/35 via-black/25 to-black/40 p-5 sm:p-6 hover:border-[#D4AF37]/35 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/85 mb-1">
            {returnLine}
          </p>
          <p className="text-[9px] tracking-[0.22em] uppercase text-white/30 mb-1">
            {continuityLine}
          </p>
          <p className="text-[8px] tracking-[0.18em] uppercase text-[#C8A24E]/35 mb-2 production-continuity-breathing">
            {atmosphereLine}
          </p>
          <h3 className="font-display text-lg text-[#F4E7C1] italic leading-snug truncate">
            {project.title || 'Untitled story'}
          </h3>
          {project.prompt ? (
            <p className="mt-2 text-sm text-white/45 line-clamp-2 leading-relaxed">
              {project.prompt}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 flex items-center justify-center">
          <Film className="w-4 h-4 text-[#C8A24E]/80" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-[9px] tracking-[0.2em] uppercase border',
            statusCls
          )}
        >
          {STATUS_LABEL[project.status] ?? project.status}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-white/35">
          <Clock className="w-3 h-3" />
          {project.updatedAt
            ? formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })
            : 'recently'}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-[#C8A24E]/70 group-hover:text-[#E7C56A] transition">
          Continue <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  )
}
