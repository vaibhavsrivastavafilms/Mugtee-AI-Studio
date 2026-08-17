'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Check, Clapperboard, Film, Play, X } from 'lucide-react'
import { RemoteImage } from '@/components/ui/remote-image'
import { V7ProductionDownloadButton } from '@/features/v7/components/production-download-button'
import { formatProjectStatusLabel } from '@/lib/projects/unified-library.core'
import type { UnifiedProjectItem } from '@/lib/projects/unified-library.types'
import { cn } from '@/lib/utils'

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

function statusTone(status: UnifiedProjectItem['status']): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    case 'running':
      return 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#E6C76A]'
    case 'failed':
      return 'border-red-500/30 bg-red-500/10 text-red-200'
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

function StatusGlyph({ status }: { status: UnifiedProjectItem['status'] }) {
  if (status === 'completed') return <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
  if (status === 'failed') return <X className="h-3.5 w-3.5 text-red-400" aria-hidden />
  if (status === 'running') {
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-[#E6C76A] shadow-[0_0_8px_rgba(230,199,106,0.8)]" aria-hidden />
    )
  }
  return <span className="text-white/35" aria-hidden>○</span>
}

function metadataLine(project: UnifiedProjectItem): string | null {
  const parts: string[] = []
  if (project.status === 'completed') {
    if (project.durationLabel) parts.push(project.durationLabel)
    if (project.aspectRatioLabel) parts.push(project.aspectRatioLabel)
  } else if (project.sceneProgressLabel) {
    parts.push(project.sceneProgressLabel)
  } else if (project.currentTask && project.status === 'running') {
    parts.push(project.currentTask)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}

export function ProjectLibraryCard({
  project,
  variant = 'library',
}: {
  project: UnifiedProjectItem
  variant?: 'library' | 'recent'
}) {
  const Icon = pipelineIcon(project.type)
  const statusLabel = formatProjectStatusLabel(project)
  const meta = metadataLine(project)
  const showProgress = project.status !== 'completed' && project.progress > 0
  const createdLabel = format(parseISO(project.createdAt), 'MMM d, yyyy')

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border bg-[#0a0a0a]/80 shadow-[0_0_40px_-28px_rgba(212,175,55,0.35)]',
        project.status === 'completed' && 'border-emerald-500/20',
        project.status === 'failed' && 'border-red-500/20 opacity-95',
        project.status === 'running' && 'border-[#D4AF37]/25',
        project.status !== 'completed' &&
          project.status !== 'failed' &&
          project.status !== 'running' &&
          'border-white/[0.08]'
      )}
    >
      <Link href={project.route} className="group relative block aspect-[16/10] w-full overflow-hidden bg-zinc-900">
        {project.thumbnailUrl ? (
          <RemoteImage
            src={project.thumbnailUrl}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            sizes={variant === 'recent' ? '280px' : '(max-width: 768px) 100vw, 25vw'}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
            <Icon className="h-10 w-10 text-[#D4AF37]/35" />
          </div>
        )}

        {project.status === 'completed' && project.isDeliverable ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white">
              <Play className="h-5 w-5 fill-current" aria-hidden />
            </span>
          </span>
        ) : null}

        {showProgress ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="text-2xl font-semibold tabular-nums text-[#E6C76A]">{project.progress}%</span>
          </div>
        ) : null}

        <span
          className={cn(
            'absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-full border px-2.5 py-1 text-[11px] font-medium',
            statusTone(project.status)
          )}
        >
          {statusLabel}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start gap-2">
            <StatusGlyph status={project.status} />
            <h2 className="min-w-0 flex-1 font-display text-base text-white line-clamp-2 sm:text-lg">
              {project.title}
            </h2>
          </div>
          {meta ? <p className="mt-1.5 text-sm text-white/55 line-clamp-2">{meta}</p> : null}
          <p className="mt-2 text-xs text-white/40">Created {createdLabel}</p>
        </div>

        {project.status === 'failed' && project.pausedReason ? (
          <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-200/85 line-clamp-2">
            {project.pausedReason}
          </p>
        ) : null}

        {showProgress ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-white/50">
              <span className="truncate">{project.currentStage ?? 'In progress'}</span>
              <span className="tabular-nums text-[#E6C76A]/90">{project.progress}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
              role="progressbar"
              aria-valuenow={project.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${project.title} progress`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#B8942E] to-[#E6C76A] transition-[width] duration-700"
                style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
              />
            </div>
            {project.etaLabel ? (
              <p className="text-xs text-white/45">ETA {project.etaLabel}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {project.actions.reopen ? (
            <Link
              href={project.route}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-semibold text-white sm:flex-none"
            >
              Reopen
            </Link>
          ) : null}
          {project.actions.reviewChanges ? (
            <Link
              href={project.route}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 sm:flex-none"
            >
              Review changes
            </Link>
          ) : null}
          {project.status === 'completed' && project.isDeliverable ? (
            <>
              <Link
                href={project.route}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#D4AF37] px-4 text-sm font-semibold text-[#0B0B0B] sm:flex-none"
              >
                Open Project
              </Link>
              {project.type === 'v7' ? (
                <V7ProductionDownloadButton
                  productionId={project.id}
                  title={project.title}
                  compact
                  label="Download MP4"
                />
              ) : project.reelUrl ? (
                <a
                  href={project.reelUrl}
                  download
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/90"
                >
                  Download MP4
                </a>
              ) : null}
            </>
          ) : project.status === 'failed' ? (
            <Link
              href={project.route}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-sm font-medium text-red-100"
            >
              View details
            </Link>
          ) : (
            <Link
              href={project.route}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 text-sm font-semibold text-[#E6C76A]"
            >
              Continue
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

export function ProjectLibraryCardSkeleton({ variant = 'library' }: { variant?: 'library' | 'recent' }) {
  return (
    <div
      className={cn(
        'animate-pulse overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]',
        variant === 'recent' ? 'w-[280px] shrink-0' : 'w-full'
      )}
    >
      <div className="aspect-[16/10] bg-white/[0.04]" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
        <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
        <div className="h-1.5 w-full rounded-full bg-white/[0.05]" />
      </div>
    </div>
  )
}
