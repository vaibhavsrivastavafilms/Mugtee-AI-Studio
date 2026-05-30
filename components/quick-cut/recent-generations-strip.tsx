'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Clapperboard, Film, Play, RefreshCw, Zap } from 'lucide-react'
import { ProjectMp4Button } from '@/components/quick-cut/project-mp4-button'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { loadRecentProjects } from '@/lib/cinematic-projects'
import {
  createEntryHref,
  openProjectHref,
  previewProjectHref,
  regenerateProjectHref,
  type CreatorMode,
} from '@/lib/create/routes'
import {
  summaryToCard,
  type ProjectCardModel,
} from '@/components/create/unified-projects-grid'

const MODE_BADGE: Record<CreatorMode, { label: string; icon: typeof Zap }> = {
  quick: { label: 'Quick Cut', icon: Zap },
  director: { label: 'Director Cut', icon: Clapperboard },
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

export function RecentGenerationsStrip({ limit = 8 }: { limit?: number }) {
  const { ready: authReady, user } = useAuthHydration()
  const signedIn = authReady ? Boolean(user) : null
  const [projects, setProjects] = useState<ProjectCardModel[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverId, setHoverId] = useState<string | null>(null)

  useEffect(() => {
    if (!signedIn) {
      setProjects([])
      setLoading(false)
      return
    }

    let alive = true
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
  }, [signedIn, limit])

  if (!signedIn || loading || !projects?.length) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-white/[0.06]"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.28em] uppercase text-gold-300">
          <Film className="w-3 h-3" /> Recent Generations
        </div>
        <Link
          href={createEntryHref(undefined, { tab: 'projects' })}
          className="text-[10px] tracking-wider uppercase text-luxe/45 hover:text-gold-300 transition inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="-mx-1 px-1 overflow-x-auto pb-2 [scrollbar-width:thin]">
        <div className="flex gap-3 sm:gap-4 min-w-min">
          {projects.map((p, i) => {
            const isHovered = hoverId === p.id
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
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.24) }}
                onMouseEnter={() => setHoverId(p.id)}
                onMouseLeave={() => setHoverId(null)}
                className="relative group w-[168px] sm:w-[188px] shrink-0"
              >
                <div className="relative flex flex-col rounded-2xl overflow-hidden border border-gold-soft hover:border-gold-500/40 bg-zinc-900/40 transition">
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
                        <Film className="w-8 h-8 text-gold-500/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur text-[8px] tracking-widest uppercase text-luxe/85 border border-white/[0.06] inline-flex items-center gap-1">
                      <ModeIcon className="w-2.5 h-2.5 text-gold-300" /> {modeMeta.label}
                    </span>
                  </div>

                  <div className="p-2.5 sm:p-3 space-y-1">
                    <h3
                      className="font-display text-[13px] leading-snug line-clamp-2 text-luxe/95"
                      title={p.title}
                    >
                      {p.title}
                    </h3>
                    <p className="text-[10px] text-luxe/45 tracking-wide">
                      {p.updatedAt
                        ? formatDistanceToNow(parseISO(p.updatedAt), { addSuffix: true })
                        : 'recently'}
                    </p>
                  </div>

                  <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 flex flex-wrap gap-1">
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
                    <CardAction href={openHref} icon={Film} label="Open" />
                    <CardAction href={regenerateHref} icon={RefreshCw} label="Regenerate" />
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}
