'use client'
// MUGTEE V3.1 — Recent Projects Grid ("Photoshop Recents" style).
//
// Cinematic card grid below the hero. Each card shows:
//   • thumbnail (first generated image for that project, or gradient placeholder)
//   • project title + kind pill (Documentary / Reel / YouTube Essay…)
//   • platform glyph + niche
//   • total asset count
//   • last edited (relative)
//   • progress status
//
// Empty state: friendly cinematic "Start your first project" cards (existing CTAs).
// EXTREME LOW CREDIT MODE: lazy-loaded <img>, motion only on enter.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, FileText, Image as ImageIcon, Sparkles, Clock, Layers, Film, Mic } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  cinematicHrefForProject,
  loadRecentProjects,
  type CinematicProjectSummary,
} from '@/lib/cinematic-projects'
import { ProjectLibraryEmpty } from '@/components/showcase/project-library-empty'

type RecentProject = {
  id: string
  title: string
  platform: string
  status: string
  niche?: string | null
  kind: string
  has_script: boolean
  asset_count: number
  thumbnail: string | null
  updated_at: string
  duration: number
}

const PLATFORM_ICON: Record<string, any> = {
  cinematic: Film,
  instagram: Film,
  youtube: Film,
  tiktok: Mic,
}

const STATUS_COLOR: Record<string, string> = {
  create:      'bg-amber-500/15 border-amber-500/30 text-amber-200',
  generating:  'bg-blue-500/15 border-blue-500/30 text-blue-200',
  preview:     'bg-indigo-500/15 border-indigo-500/30 text-indigo-200',
  director:    'bg-purple-500/15 border-purple-500/30 text-purple-200',
  scenes:      'bg-pink-500/15 border-pink-500/30 text-pink-200',
  voiceover:   'bg-cyan-500/15 border-cyan-500/30 text-cyan-200',
  compile:     'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
  complete:    'bg-gold-500/15 border-gold-500/40 text-gold-200',
  planning:    'bg-amber-500/15 border-amber-500/30 text-amber-200',
  scripting:   'bg-blue-500/15 border-blue-500/30 text-blue-200',
  filming:     'bg-purple-500/15 border-purple-500/30 text-purple-200',
  editing:     'bg-pink-500/15 border-pink-500/30 text-pink-200',
  ready:       'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
  published:   'bg-gold-500/15 border-gold-500/40 text-gold-200',
}

function summaryToCard(project: CinematicProjectSummary): RecentProject {
  const thumbScene = project.scenes.find(
    (scene) => scene.storyboardImages?.[0]?.url || scene.imageUrl
  )
  const thumbnail =
    thumbScene?.storyboardImages?.find((img) => img.id === thumbScene.activeStoryboardId)?.url ||
    thumbScene?.storyboardImages?.[0]?.url ||
    thumbScene?.imageUrl ||
    null

  return {
    id: project.id,
    title: project.title,
    platform: 'cinematic',
    status: project.status,
    niche: `${project.duration}s`,
    kind: 'Cinematic Reel',
    has_script: project.script.trim().length > 0,
    asset_count: project.scenes.length,
    thumbnail,
    updated_at: project.updatedAt,
    duration: project.duration,
  }
}

export function RecentProjectsGrid() {
  const [projects, setProjects] = useState<RecentProject[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const rows = await loadRecentProjects(8)
        if (!alive) return
        const unique = Array.from(
          new Map(rows.map((p) => [p.id, summaryToCard(p)])).values()
        ).slice(0, 8)
        setProjects(unique)
      } catch {
        if (alive) setProjects([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className="aspect-[4/5] rounded-2xl border border-white/[0.04] shimmer-cinematic"
          />
        ))}
      </div>
    )
  }

  if (!projects || projects.length === 0) {
    return <ProjectLibraryEmpty />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-300">
          <Layers className="w-3 h-3" /> Recent productions
        </div>
        <Link href="/create?tab=projects" className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 transition inline-flex items-center gap-1">
          See all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {projects.slice(0, 8).map((p, i) => {
          const Icon = PLATFORM_ICON[p.platform] || Film
          const statusCls = STATUS_COLOR[p.status] || 'bg-white/[0.05] border-white/[0.1] text-luxe/70'
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.32) }}
            >
              <Link
                href={cinematicHrefForProject(p.status, p.id)}
                className="group block rounded-2xl overflow-hidden border border-gold-soft hover:border-gold-500/40 transition bg-zinc-900/40"
              >
                <div className="relative aspect-[4/5] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="w-10 h-10 text-gold-500/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                  <span className={cn('absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] tracking-[0.2em] uppercase border', statusCls)}>
                    {p.status}
                  </span>
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur text-[9px] tracking-widest uppercase text-luxe/85 border border-white/[0.06] inline-flex items-center gap-1">
                    <Icon className="w-2.5 h-2.5 text-gold-300" /> {p.duration}s
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] tracking-[0.25em] uppercase text-gold-300/85">
                    <span>{p.kind}</span>
                    {p.niche && <><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{p.niche}</span></>}
                  </div>
                  <h3 className="font-display text-[14px] leading-snug truncate" title={p.title}>{p.title}</h3>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground tracking-wider">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {p.updated_at ? formatDistanceToNow(parseISO(p.updated_at), { addSuffix: true }) : 'recently'}</span>
                    <span className="inline-flex items-center gap-1">
                      {p.has_script && <FileText className="w-3 h-3 text-gold-400/70" />}
                      {p.asset_count > 0 && <span className="inline-flex items-center gap-1"><ImageIcon className="w-3 h-3 text-gold-400/70" /> {p.asset_count}</span>}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
