'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Clapperboard,
  Film,
  Play,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  openProjectHref,
  createEntryHref,
  previewProjectHref,
  regenerateProjectHref,
  type CreatorMode,
} from '@/lib/create/routes'
import { loadRecentProjects, projectHasPlayablePreview, type CinematicProjectSummary } from '@/lib/cinematic-projects'
import { projectCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import { ProjectMp4Button } from '@/components/quick-cut/project-mp4-button'
import { ProjectLibraryEmpty } from '@/components/showcase/project-library-empty'
import { DatabaseMigrationBanner } from '@/components/app/database-migration-banner'
import type { ProjectGalleryFilter } from '@/components/create/projects-gallery-chrome'

export type ProjectCardModel = {
  id: string
  title: string
  status: string
  statusLabel: string
  mode: CreatorMode
  duration: number
  style: string
  platform: string
  thumbnail: string | null
  videoUrl: string | null
  canCompileMp4: boolean
  hasPlayablePreview: boolean
  updatedAt: string
}

const STATUS_LABEL: Record<string, string> = {
  create: 'Drafting',
  generating: 'In motion',
  preview: 'Preview ready',
  director: 'Directed',
  compile: 'Rendering',
  complete: 'Ready to share',
}

const MODE_BADGE: Record<CreatorMode, { label: string; icon: typeof Zap }> = {
  quick: { label: 'Quick Cut', icon: Zap },
  director: { label: 'Director Cut', icon: Clapperboard },
}

export function summaryToCard(project: CinematicProjectSummary): ProjectCardModel {
  const thumbFromDb = project.thumbnail_url
  const thumbScene = project.scenes.find(
    (scene) => scene.storyboardImages?.[0]?.url || scene.imageUrl
  )
  const thumbnail =
    thumbFromDb ||
    thumbScene?.storyboardImages?.find((img) => img.id === thumbScene.activeStoryboardId)?.url ||
    thumbScene?.storyboardImages?.[0]?.url ||
    thumbScene?.imageUrl ||
    null

  const mode: CreatorMode =
    project.mode === 'quick' || project.mode === 'director'
      ? project.mode
      : project.status === 'preview' ||
          project.status === 'reviewing' ||
          project.status === 'generating' ||
          project.status === 'editing' ||
          project.status === 'compile' ||
          project.status === 'complete' ||
          project.status === 'completed'
        ? 'quick'
        : 'director'

  return {
    id: project.id,
    title: project.title,
    status: project.status,
    statusLabel: STATUS_LABEL[project.status] || 'In progress',
    mode,
    duration: project.duration,
    style: project.style || 'cinematic',
    platform: 'Instagram Reel',
    thumbnail,
    videoUrl: project.video_url ?? null,
    canCompileMp4: projectCanCompileMp4(project.scenes, project.voice),
    hasPlayablePreview: projectHasPlayablePreview(
      project.scenes,
      project.voice,
      project.video_url
    ),
    updatedAt: project.updatedAt,
  }
}

export function UnifiedProjectsGrid({
  limit = 24,
  showActions = true,
  filter = 'all',
  galleryMode = false,
  searchQuery = '',
  galleryFilter = 'all',
  selectedId = null,
  onSelectProject,
}: {
  limit?: number
  showActions?: boolean
  filter?: 'all' | 'downloaded'
  galleryMode?: boolean
  searchQuery?: string
  galleryFilter?: ProjectGalleryFilter
  selectedId?: string | null
  onSelectProject?: (project: ProjectCardModel | null) => void
}) {
  const [projects, setProjects] = useState<ProjectCardModel[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [tableUnavailable, setTableUnavailable] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [hoverId, setHoverId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const { projects: rows, tableUnavailable: missing } = await loadRecentProjects(limit)
        if (!alive) return
        setTableUnavailable(missing)
        let cards = rows.map((row) => summaryToCard(row))
        if (filter === 'downloaded') {
          cards = cards.filter(
            (p) =>
              p.videoUrl ||
              p.hasPlayablePreview ||
              p.status === 'compile' ||
              p.status === 'complete' ||
              p.status === 'completed'
          )
        }
        setProjects(cards)
      } catch {
        if (alive) setProjects([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [limit, filter, reloadKey])

  const retryLoadProjects = () => setReloadKey((k) => k + 1)

  if (loading) {
    return (
      <div
        className={cn(
          'grid gap-3 sm:gap-4',
          galleryMode
            ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/5] rounded-2xl border border-white/[0.04] shimmer-cinematic" />
        ))}
      </div>
    )
  }

  const q = searchQuery.trim().toLowerCase()
  const visible = (projects ?? []).filter((p) => {
    if (q && !p.title.toLowerCase().includes(q) && !p.style.toLowerCase().includes(q)) return false
    if (galleryFilter === 'quick' && p.mode !== 'quick') return false
    if (galleryFilter === 'director' && p.mode !== 'director') return false
    if (
      galleryFilter === 'downloaded' &&
      !p.videoUrl &&
      p.status !== 'compile' &&
      p.status !== 'complete'
    ) {
      return false
    }
    return true
  })

  if (tableUnavailable) {
    return (
      <div className="space-y-4">
        <DatabaseMigrationBanner />
        <ProjectLibraryEmpty />
      </div>
    )
  }

  if (!projects || projects.length === 0) {
    return <ProjectLibraryEmpty />
  }

  if (visible.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        No cinematic stories match your filters.
      </div>
    )
  }

  return (
    <div>
      {!galleryMode ? (
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-300">
            <Film className="w-3 h-3" /> Cinematic Stories
          </div>
          <Link
            href={createEntryHref(undefined, { tab: 'projects' })}
            className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 transition inline-flex items-center gap-1"
          >
            See all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : null}

      <div
        className={cn(
          'grid gap-3 sm:gap-4',
          galleryMode
            ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        )}
      >
        {visible.map((p, i) => {
          const isHovered = hoverId === p.id
          const isSelected = selectedId === p.id
          const modeMeta = MODE_BADGE[p.mode]
          const ModeIcon = modeMeta.icon
          const previewHref = previewProjectHref({
            id: p.id,
            mode: p.mode,
            status: p.status,
            videoUrl: p.videoUrl,
            hasPlayablePreview: p.hasPlayablePreview,
          })
          const openHref = openProjectHref(p.status, p.id, p.mode, {
            videoUrl: p.videoUrl,
            hasPlayablePreview: p.hasPlayablePreview,
          })
          const regenerateHref = regenerateProjectHref(p.id, p.mode)

          return (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: galleryMode ? -4 : -2 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.32) }}
              onMouseEnter={() => {
                setHoverId(p.id)
                onSelectProject?.(p)
              }}
              onMouseLeave={() => {
                setHoverId(null)
                if (selectedId === p.id) onSelectProject?.(null)
              }}
              onFocus={() => onSelectProject?.(p)}
              className="relative group"
            >
              {(isHovered || isSelected) && galleryMode ? (
                <div
                  className="pointer-events-none absolute -inset-1 rounded-2xl bg-gold-500/20 blur-xl opacity-60 z-0"
                  aria-hidden
                />
              ) : null}

              <div
                className={cn(
                  'relative z-[1] flex flex-col rounded-2xl overflow-hidden border transition bg-zinc-900/40',
                  galleryMode
                    ? 'border-[var(--v2-border)] bg-[var(--v2-surface)] hover:border-[var(--v2-gold)]/45 hover:shadow-[0_0_40px_-12px_rgba(212,175,55,0.35)]'
                    : 'border-gold-soft hover:border-gold-500/40',
                  isSelected && 'border-gold-500/45'
                )}
              >
                {/* TOP — thumbnail, duration, mode badge */}
                <div className="relative aspect-[4/5] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 overflow-hidden">
                  {isHovered && p.videoUrl ? (
                    <video
                      src={p.videoUrl}
                      className="absolute inset-0 w-full h-full object-cover scale-[1.03] transition-transform duration-500"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : p.thumbnail ? (
                    <img
                      src={p.thumbnail}
                      alt={p.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="w-10 h-10 text-gold-500/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[10px] tracking-widest text-luxe/90 border border-white/[0.08]">
                    {p.duration}s
                  </span>
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur text-[9px] tracking-widest uppercase text-luxe/85 border border-white/[0.06] inline-flex items-center gap-1">
                    <ModeIcon className="w-2.5 h-2.5 text-gold-300" /> {modeMeta.label}
                  </span>
                </div>

                {/* CENTER — title, subtext */}
                <div className="p-3 sm:p-4 space-y-1.5 flex-1">
                  <h3 className="font-display text-[15px] leading-snug line-clamp-2" title={p.title}>
                    {p.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground tracking-wide">
                    {p.style} · {p.platform} ·{' '}
                    {p.updatedAt
                      ? formatDistanceToNow(parseISO(p.updatedAt), { addSuffix: true })
                      : 'recently'}
                  </p>
                  <p className="text-[10px] text-gold-300/70 tracking-wide">{p.statusLabel}</p>
                </div>

                {/* BOTTOM — actions */}
                {showActions ? (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-wrap gap-1.5">
                    <CardAction href={previewHref} icon={Play} label="Preview" />
                    <ProjectMp4Button
                      projectId={p.id}
                      title={p.title}
                      videoUrl={p.videoUrl}
                      canCompileMp4={p.canCompileMp4}
                      exportHref={previewHref}
                      onVideoUrl={(url) => {
                        setProjects((prev) =>
                          prev?.map((card) =>
                            card.id === p.id ? { ...card, videoUrl: url } : card
                          ) ?? prev
                        )
                      }}
                    />
                    <CardAction href={openHref} icon={Film} label="Open Project" />
                    <CardAction href={regenerateHref} icon={RefreshCw} label="Regenerate" />
                  </div>
                ) : null}
              </div>
            </motion.article>
          )
        })}
      </div>
    </div>
  )
}

const cardActionClass =
  'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur border border-white/10 text-[9px] tracking-wider uppercase text-luxe/90 hover:border-gold-500/40 hover:text-gold-200 transition'

function CardAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Play
  label: string
}) {
  return (
    <Link href={href} className={cardActionClass} onClick={(e) => e.stopPropagation()}>
      <Icon className="w-3 h-3" /> {label}
    </Link>
  )
}
