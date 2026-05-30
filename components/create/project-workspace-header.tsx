'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowLeft, Download, Sparkles } from 'lucide-react'
import { QuickCutProjectTranscriptDialog } from '@/components/quick-cut/project-transcript-dialog'
import { cn } from '@/lib/utils'
import {
  STUDIO,
  createEntryHref,
  createProjectHref,
  type CreatorMode,
} from '@/lib/create/routes'
import { loadProject, resolveProjectScenes } from '@/lib/cinematic-projects'
import {
  projectCanCompileMp4,
  quickCutCanCompileMp4,
} from '@/lib/quick-cut/compile-project-mp4.client'
import { ProjectMp4Button } from '@/components/quick-cut/project-mp4-button'
import { relSavedLabel } from '@/stores/cinematic-project'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const STATUS_LABEL: Record<string, string> = {
  create: 'Drafting',
  generating: 'In motion',
  preview: 'Preview ready',
  director: 'Directed',
  compile: 'Rendering',
  complete: 'Ready to share',
}

type ProjectWorkspaceHeaderProps = {
  projectId: string
  mode: CreatorMode
  title?: string | null
  status?: string | null
  updatedAt?: string | null
  lastSavedAt?: number | null
}

export function ProjectWorkspaceHeader({
  projectId,
  mode,
  title: titleProp,
  status: statusProp,
  updatedAt,
  lastSavedAt: lastSavedAtProp,
}: ProjectWorkspaceHeaderProps) {
  const storeTitle = useQuickCutGenerationStore((s) => s.title)
  const storeLastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const studioReviewMode = useQuickCutGenerationStore((s) => s.studioReviewMode)
  const storeScenes = useQuickCutGenerationStore((s) => s.scenes)
  const storeVoiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const storeVideoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)

  const [persistedVideoUrl, setPersistedVideoUrl] = useState<string | null>(null)
  const [persistedCanCompile, setPersistedCanCompile] = useState(false)

  useEffect(() => {
    let alive = true
    void loadProject(projectId)
      .then((row) => {
        if (!alive) return
        setPersistedVideoUrl(row.video_url?.trim() ?? null)
        setPersistedCanCompile(
          projectCanCompileMp4(resolveProjectScenes(row), row.voice)
        )
      })
      .catch(() => {
        if (alive) {
          setPersistedVideoUrl(null)
          setPersistedCanCompile(false)
        }
      })
    return () => {
      alive = false
    }
  }, [projectId])

  const quickCanCompile =
    mode === 'quick' &&
    quickCutCanCompileMp4(storeScenes, storeVoiceUrl, videoRenderEnabled)
  const canCompileMp4 =
    mode === 'quick' ? quickCanCompile : persistedCanCompile
  const headerVideoUrl =
    mode === 'quick' ? storeVideoUrl ?? persistedVideoUrl : persistedVideoUrl

  const title = titleProp || (mode === 'quick' ? storeTitle : '') || 'Untitled project'
  const lastSavedAt = lastSavedAtProp ?? (mode === 'quick' ? storeLastSavedAt : null)

  const status =
    statusProp ||
    (mode === 'quick' && studioReviewMode
      ? 'preview'
      : mode === 'quick' && isComplete
        ? 'complete'
        : mode === 'quick' && generationStep !== 'idle'
          ? 'generating'
          : 'create')

  const statusLabel = STATUS_LABEL[status] || 'In progress'
  const updatedLabel = updatedAt
    ? formatDistanceToNow(parseISO(updatedAt), { addSuffix: true })
    : relSavedLabel(lastSavedAt) || 'Recently updated'

  const actionClass = cn(
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] tracking-[0.14em] uppercase',
    'border border-white/[0.08] bg-black/40 backdrop-blur text-luxe/85',
    'hover:border-gold-500/40 hover:text-gold-200 transition'
  )

  return (
    <header className="mb-4 sm:mb-5 px-0.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Link
            href={STUDIO.projects}
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-gold-300 transition"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Projects
          </Link>
          <h1 className="font-display text-xl sm:text-2xl text-luxe truncate" title={title}>
            {title}
          </h1>
          <p className="text-[11px] text-muted-foreground tracking-wide">
            <span className="text-gold-300/80">{statusLabel}</span>
            <span className="mx-2 text-white/20">·</span>
            <span>{updatedLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {mode === 'quick' ? <QuickCutProjectTranscriptDialog /> : null}
          <Link href={createEntryHref('quick')} className={actionClass}>
            <Sparkles className="w-3 h-3" /> Generate More
          </Link>
          <Link href={createProjectHref(projectId, 'export')} className={actionClass}>
            <Download className="w-3 h-3" /> Export
          </Link>
          <ProjectMp4Button
            projectId={projectId}
            title={title}
            videoUrl={headerVideoUrl}
            canCompileMp4={canCompileMp4}
            exportHref={createProjectHref(projectId, 'export')}
            onVideoUrl={(url) => {
              setPersistedVideoUrl(url)
              if (mode === 'quick') {
                useQuickCutGenerationStore.setState({ videoUrl: url })
              }
            }}
          />
        </div>
      </div>
    </header>
  )
}
