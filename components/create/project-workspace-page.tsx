'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QuickCutCreator } from '@/components/create/quick-cut-creator'
import { ProjectWorkspaceHeader } from '@/components/create/project-workspace-header'
import { useQuickCutProjectHydration } from '@/hooks/use-quick-cut-project-hydration'
import { loadProject } from '@/lib/cinematic-projects'
import { STUDIO, type CreatorMode } from '@/lib/create/routes'
import WorkspacePage from '@/app/workspace/page'

type ProjectMeta = {
  title: string
  status: string
  updatedAt: string
}

function QuickCutProjectBody({
  projectId,
  meta,
}: {
  projectId: string
  meta: ProjectMeta | null
}) {
  useQuickCutProjectHydration(projectId)

  return (
    <>
      <ProjectWorkspaceHeader
        projectId={projectId}
        mode="quick"
        title={meta?.title}
        status={meta?.status}
        updatedAt={meta?.updatedAt}
      />
      <QuickCutCreator />
    </>
  )
}

function DirectorProjectBody({
  projectId,
  meta,
}: {
  projectId: string
  meta: ProjectMeta
}) {
  return (
    <>
      <ProjectWorkspaceHeader
        projectId={projectId}
        mode="director"
        title={meta.title}
        status={meta.status}
        updatedAt={meta.updatedAt}
      />
      <WorkspacePage embeddedProjectId={projectId} />
    </>
  )
}

function ProjectWorkspaceInner() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string | undefined
  const [mode, setMode] = useState<CreatorMode | null>(null)
  const [meta, setMeta] = useState<ProjectMeta | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return

    let alive = true
    ;(async () => {
      try {
        const row = await loadProject(projectId)
        if (!alive) return
        const resolvedMode: CreatorMode = row.mode === 'quick' ? 'quick' : 'director'
        setMode(resolvedMode)
        setMeta({
          title: row.title,
          status: row.status,
          updatedAt: row.updated_at,
        })
      } catch {
        if (alive) router.replace(STUDIO.projects)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [projectId, router])

  if (!projectId || loading || !mode) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
        Opening project workspace…
      </div>
    )
  }

  if (mode === 'quick') {
    return <QuickCutProjectBody projectId={projectId} meta={meta} />
  }

  if (!meta) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
        Opening project workspace…
      </div>
    )
  }

  return <DirectorProjectBody projectId={projectId} meta={meta} />
}

export function ProjectWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Opening project workspace…
        </div>
      }
    >
      <ProjectWorkspaceInner />
    </Suspense>
  )
}
