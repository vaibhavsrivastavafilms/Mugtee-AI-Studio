'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Copy, Download, Film, Loader2, Plus, Trash2 } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  createEntryHref,
  createProjectHref,
  commandCenterWorkspaceHref,
  STUDIO,
} from '@/lib/create/routes'
import {
  deleteProject,
  duplicateProject,
  loadRecentProjects,
} from '@/lib/cinematic-projects'
import { summaryToCard, type ProjectCardModel } from '@/components/create/unified-projects-grid'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { useConfirm } from '@/components/ui/confirm'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { relSavedLabel } from '@/stores/cinematic-project'

const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md text-[9px] tracking-[0.14em] uppercase border border-transparent text-luxe/65 hover:text-gold-200 hover:bg-white/[0.04] hover:border-white/[0.08] transition disabled:opacity-40'

const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md text-[9px] tracking-[0.14em] uppercase border border-gold-500/30 bg-gold-500/10 text-gold-100 hover:bg-gold-500/15 transition disabled:opacity-40'

type StudioProjectContextProps = {
  projectId?: string
  className?: string
}

export function StudioProjectContext({ projectId, className }: StudioProjectContextProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const hook = useQuickCutGenerationStore((s) => s.hook)

  const activeId = projectId ?? savedProjectId ?? null
  const [recent, setRecent] = useState<ProjectCardModel[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [recentOpen, setRecentOpen] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { projects } = await loadRecentProjects(5)
        if (!alive) return
        setRecent(projects.map((row) => summaryToCard(row)))
      } catch {
        if (alive) setRecent([])
      } finally {
        if (alive) setLoadingRecent(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [activeId])

  const progress = (() => {
    if (isComplete) return 100
    let pct = 5
    const s = useQuickCutGenerationStore.getState()
    if (s.prompt.trim().length >= 6) pct = 10
    if (hook.trim()) pct = 20
    if (s.script.trim()) pct = 35
    if (scenes.length > 0) pct = 55
    if (scenes.some((sc) => sc.imageUrl)) pct = 70
    if (s.voiceUrl) pct = 85
    if (s.videoUrl) pct = 95
    return pct
  })()

  const handleNew = () => {
    resetQuickCutForFreshCreate()
    router.push(createEntryHref('quick'))
  }

  const handleDuplicate = async () => {
    if (!activeId) return
    setActionBusy('duplicate')
    try {
      const row = await duplicateProject(activeId)
      router.push(commandCenterWorkspaceHref(row.id))
    } finally {
      setActionBusy(null)
    }
  }

  const handleDelete = async () => {
    if (!activeId) return
    const ok = await confirm({
      title: 'Delete project?',
      description: 'This removes the project from your library permanently.',
      confirmText: 'Delete',
      destructive: true,
    })
    if (!ok) return
    setActionBusy('delete')
    try {
      await deleteProject(activeId)
      resetQuickCutForFreshCreate()
      router.push(STUDIO.projects)
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      <div>
        <p className="text-[12px] font-medium text-luxe/90 line-clamp-2 leading-snug">
          {title || 'Untitled project'}
        </p>
        <dl className="mt-1.5 grid grid-cols-3 gap-1 text-[10px]">
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider">Duration</dt>
            <dd className="text-luxe/80 mt-0.5">{duration}s</dd>
          </div>
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider">Scenes</dt>
            <dd className="text-luxe/80 mt-0.5">{scenes.length}</dd>
          </div>
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider">Niche</dt>
            <dd className="text-luxe/80 capitalize mt-0.5 truncate">{niche.replace(/_/g, ' ')}</dd>
          </div>
        </dl>
      </div>

      <div>
        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-luxe/45 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div
            className="h-full bg-gold-gradient"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="text-[9px] text-luxe/40 mt-1 tracking-wide">
          {relSavedLabel(lastSavedAt) ||
            (generationStep !== 'idle' ? 'In session' : 'Not saved yet')}
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={handleNew} className={primaryBtn}>
          <Plus className="w-3 h-3" /> New
        </button>
        <button
          type="button"
          onClick={() => void handleDuplicate()}
          disabled={!activeId || actionBusy === 'duplicate'}
          className={ghostBtn}
        >
          {actionBusy === 'duplicate' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          Duplicate
        </button>
        {activeId ? (
          <Link href={createProjectHref(activeId, 'export')} className={ghostBtn}>
            <Download className="w-3 h-3" /> Export
          </Link>
        ) : (
          <span className={cn(ghostBtn, 'opacity-40 pointer-events-none')}>
            <Download className="w-3 h-3" /> Export
          </span>
        )}
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={!activeId || actionBusy === 'delete'}
          className={cn(ghostBtn, 'hover:text-red-200/90')}
        >
          {actionBusy === 'delete' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Trash2 className="w-3 h-3" />
          )}
          Delete
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setRecentOpen((v) => !v)}
          className="text-[9px] tracking-[0.18em] uppercase text-gold-300/60 hover:text-gold-200 transition"
        >
          {recentOpen ? '▼' : '▶'} Recent projects
        </button>
        {recentOpen ? (
          <ul className="mt-1.5 space-y-0.5 max-h-[120px] overflow-y-auto scrollbar-luxe">
            {loadingRecent ? (
              <li className="text-[10px] text-luxe/40 py-1 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading…
              </li>
            ) : recent.length === 0 ? (
              <li className="text-[10px] text-luxe/45 italic py-1">No recent projects</li>
            ) : (
              recent.map((project) => (
                <li key={project.id}>
                  <Link
                    href={commandCenterWorkspaceHref(project.id)}
                    className={cn(
                      'block rounded-md px-2 py-1.5 text-[10px] transition',
                      project.id === activeId
                        ? 'bg-gold-500/[0.1] text-gold-100'
                        : 'text-luxe/70 hover:bg-white/[0.03]'
                    )}
                  >
                    <span className="line-clamp-1 font-medium">{project.title}</span>
                    <span className="text-[9px] text-luxe/40 flex items-center gap-1 mt-0.5">
                      <Film className="w-2.5 h-2.5" />
                      {formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
