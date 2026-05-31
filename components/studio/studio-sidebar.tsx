'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Copy,
  Download,
  Film,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
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

type StudioSidebarProps = {
  projectId?: string
  className?: string
}

export function StudioSidebar({ projectId, className }: StudioSidebarProps) {
  const router = useRouter()
  const confirm = useConfirm()
  const title = useQuickCutGenerationStore((s) => s.title)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const script = useQuickCutGenerationStore((s) => s.script)

  const activeId = projectId ?? savedProjectId ?? null
  const [recent, setRecent] = useState<ProjectCardModel[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { projects } = await loadRecentProjects(6)
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
    if (useQuickCutGenerationStore.getState().prompt.trim().length >= 6) pct = 10
    if (useQuickCutGenerationStore.getState().hook.trim()) pct = 20
    if (script.trim()) pct = 35
    if (scenes.length > 0) pct = 55
    if (scenes.some((s) => s.imageUrl)) pct = 70
    if (useQuickCutGenerationStore.getState().voiceUrl) pct = 85
    if (useQuickCutGenerationStore.getState().videoUrl) pct = 95
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

  const actionBtnClass = cn(
    'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[10px] tracking-[0.14em] uppercase',
    'border border-white/[0.08] bg-black/40 text-luxe/80',
    'hover:border-gold-500/35 hover:text-gold-200 transition disabled:opacity-50'
  )

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-[240px] shrink-0 min-h-0',
        'border-r border-white/[0.06] bg-black/35 backdrop-blur-md',
        className
      )}
    >
      <div className="p-4 border-b border-white/[0.06] space-y-3">
        <div>
          <p className="text-[9px] tracking-[0.26em] uppercase text-gold-300/65 mb-1">
            Project
          </p>
          <h2 className="font-display text-lg text-luxe leading-snug line-clamp-2">
            {title || 'Untitled project'}
          </h2>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider">Niche</dt>
            <dd className="text-luxe/85 capitalize mt-0.5">{niche.replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider">Duration</dt>
            <dd className="text-luxe/85 mt-0.5">{duration}s</dd>
          </div>
        </dl>

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
        </div>

        <p className="text-[10px] text-luxe/45 tracking-wide">
          {relSavedLabel(lastSavedAt) ||
            (generationStep !== 'idle' ? 'In session' : 'Not saved yet')}
        </p>
      </div>

      <div className="p-3 space-y-1.5 border-b border-white/[0.06]">
        <button type="button" onClick={handleNew} className={actionBtnClass}>
          <Plus className="w-3.5 h-3.5" /> New
        </button>
        <button
          type="button"
          onClick={() => void handleDuplicate()}
          disabled={!activeId || actionBusy === 'duplicate'}
          className={actionBtnClass}
        >
          {actionBusy === 'duplicate' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          Duplicate
        </button>
        {activeId ? (
          <Link href={createProjectHref(activeId, 'export')} className={actionBtnClass}>
            <Download className="w-3.5 h-3.5" /> Export
          </Link>
        ) : (
          <span className={cn(actionBtnClass, 'opacity-40 pointer-events-none')}>
            <Download className="w-3.5 h-3.5" /> Export
          </span>
        )}
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={!activeId || actionBusy === 'delete'}
          className={cn(actionBtnClass, 'hover:border-red-500/30 hover:text-red-200/90')}
        >
          {actionBusy === 'delete' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Delete
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe p-3">
        <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/60 mb-2 px-1">
          Recent
        </p>
        {loadingRecent ? (
          <div className="flex items-center gap-2 text-xs text-luxe/40 py-2 px-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        ) : recent.length === 0 ? (
          <p className="text-[11px] text-luxe/45 italic px-1">No recent projects</p>
        ) : (
          <ul className="space-y-1">
            {recent.map((project) => {
              const isCurrent = project.id === activeId
              return (
                <li key={project.id}>
                  <Link
                    href={commandCenterWorkspaceHref(project.id)}
                    className={cn(
                      'block rounded-lg px-2.5 py-2 transition',
                      isCurrent
                        ? 'bg-gold-500/[0.12] border border-gold-500/25'
                        : 'hover:bg-white/[0.03] border border-transparent'
                    )}
                  >
                    <p className="text-[11px] text-luxe/90 line-clamp-1 font-medium">
                      {project.title}
                    </p>
                    <p className="text-[9px] text-luxe/40 mt-0.5 flex items-center gap-1">
                      <Film className="w-2.5 h-2.5" />
                      {formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
