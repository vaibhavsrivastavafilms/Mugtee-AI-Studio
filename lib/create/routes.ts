import type { CinematicProjectStatus } from '@/stores/cinematic-project'
import {
  isQuickCutStageTab,
  type QuickCutStageTab,
} from '@/lib/cinematic/quick-cut/stage-tabs'
import { isFinishedProjectStatus } from '@/lib/cinematic/project-status'

export type CreatorMode = 'quick' | 'director'

export type CreateSegment = 'generate' | 'director' | 'export'

const STUDIO = {
  root: '/studio',
  create: '/studio/create',
  quick: '/studio/quick',
  projects: '/studio/projects',
  project: '/studio/project',
  knowledge: '/studio/knowledge',
  growth: '/studio/growth',
  analytics: '/studio/analytics',
  exports: '/studio/exports',
  assets: '/studio/assets',
  director: '/studio/director',
  workspace: '/studio/workspace',
  settings: '/studio/settings',
  memory: '/studio/memory',
  marketplace: '/studio/marketplace',
  integrations: '/studio/integrations',
  workspaces: '/studio/workspaces',
} as const

export { STUDIO }

/** Canonical Quick Mode surface — fast one-click generation. */
export function quickCutStudioHref(
  params?: Record<string, string | undefined>
): string {
  const qs = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value)
    }
  }
  const q = qs.toString()
  return q ? `${STUDIO.quick}?${q}` : STUDIO.quick
}

/** Director Mode project workspace — full cinematic pipeline shell. */
export function projectWorkspaceHref(
  projectId: string,
  options?: { tab?: QuickCutStageTab; regen?: boolean }
): string {
  const params: Record<string, string | undefined> = {}
  if (options?.tab) params.tab = options.tab
  if (options?.regen) params.regen = '1'
  return directorWorkspaceHref(projectId, params)
}

/** Director Mode Command Center — alias for project workspace href. */
export function commandCenterWorkspaceHref(
  projectId?: string | null,
  options?: { tab?: QuickCutStageTab; regen?: boolean }
): string {
  const params: Record<string, string | undefined> = {}
  if (options?.tab) params.tab = options.tab
  if (options?.regen) params.regen = '1'
  return directorWorkspaceHref(projectId, params)
}

/** Project continuity route — resolves to the dedicated workspace. */
export function projectContinuityHref(projectId: string): string {
  return projectWorkspaceHref(projectId)
}

/** Canonical Director Mode surface — the cinematic workspace canvas. */
export function directorWorkspaceHref(
  projectId?: string | null,
  params?: Record<string, string | undefined>
): string {
  const qs = new URLSearchParams()
  if (projectId) qs.set('project', projectId)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value)
    }
  }
  const q = qs.toString()
  return q ? `${STUDIO.director}?${q}` : STUDIO.director
}

const DIRECTOR_STATUS_SEGMENT: Record<string, CreateSegment> = {
  idle: 'director',
  create: 'director',
  generating: 'director',
  preview: 'generate',
  director: 'director',
  scenes: 'director',
  voiceover: 'director',
  compile: 'export',
  complete: 'export',
}

export function createEntryHref(
  mode?: CreatorMode,
  params?: Record<string, string | undefined>
): string {
  if (mode === 'director') {
    return directorWorkspaceHref(undefined, params)
  }
  if (mode === 'quick') {
    return quickCutStudioHref(params)
  }
  const qs = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value)
    }
  }
  const q = qs.toString()
  return q ? `${STUDIO.create}?${q}` : STUDIO.create
}

/** Redirect legacy /create?mode=* to dedicated mode routes. */
export function legacyCreateRedirectTarget(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): string | null {
  const mode = searchParams.get('mode')
  if (mode === 'director') return directorWorkspaceHref()
  if (mode === 'quick') {
    const qs = new URLSearchParams()
    for (const key of ['project', 'topic', 'prompt', 'autorun', 'resume', 'experience', 'tab', 'regen']) {
      const value = searchParams.get(key)
      if (value) qs.set(key, value)
    }
    const q = qs.toString()
    return q ? `${STUDIO.quick}?${q}` : STUDIO.quick
  }
  return null
}

/** Infer active creator mode from pathname. */
export function creatorModeFromPathname(pathname: string): CreatorMode | null {
  if (
    pathname === STUDIO.quick ||
    pathname.startsWith(`${STUDIO.quick}/`) ||
    pathname === '/quick-cut' ||
    pathname.startsWith('/quick-cut/')
  ) {
    return 'quick'
  }
  if (
    pathname === STUDIO.director ||
    pathname.startsWith(`${STUDIO.director}/`) ||
    pathname === STUDIO.workspace ||
    pathname.startsWith(`${STUDIO.workspace}/`)
  ) {
    return 'director'
  }
  return null
}

/** Switch between Quick and Director while preserving project context. */
export function switchCreatorModeHref(
  targetMode: CreatorMode,
  projectId?: string | null,
  params?: Record<string, string | undefined>
): string {
  if (targetMode === 'quick') {
    const merged = { ...params }
    if (projectId) merged.project = projectId
    return quickCutStudioHref(merged)
  }
  return directorWorkspaceHref(projectId, params)
}

export function createProjectHref(
  projectId: string,
  segment: CreateSegment = 'director'
): string {
  if (segment === 'director') {
    return directorWorkspaceHref(projectId)
  }
  return `${STUDIO.create}/${projectId}/${segment}`
}

/** PREVIEW action — open export when a reel can play or compile; otherwise resume editing. */
export function previewProjectHref(input: {
  id: string
  mode: CreatorMode
  status: string
  videoUrl: string | null
  hasPlayablePreview: boolean
}): string {
  if (input.mode === 'quick') {
    return createProjectHref(
      input.id,
      input.videoUrl || input.hasPlayablePreview ? 'export' : 'generate'
    )
  }

  const exportReady =
    Boolean(input.videoUrl) ||
    input.hasPlayablePreview ||
    isFinishedProjectStatus(input.status) ||
    input.status === 'compile'

  return createProjectHref(input.id, exportReady ? 'export' : 'director')
}

/** Infer stage tab for OPEN from card/list metadata (full row uses project-hydration). */
export function inferOpenStageTabFromCard(input: {
  status: string
  videoUrl?: string | null
  hasPlayablePreview?: boolean
}): QuickCutStageTab | undefined {
  if (input.videoUrl) return 'complete'
  if (
    input.status === 'compile' ||
    input.status === 'complete' ||
    isFinishedProjectStatus(input.status)
  ) {
    return 'complete'
  }
  if (input.hasPlayablePreview) return 'visuals'
  return undefined
}

/** Quick Mode — open saved project in the minimal generation flow. */
export function openQuickCutProjectHref(
  projectId: string,
  stageTab?: QuickCutStageTab
): string {
  const params: Record<string, string | undefined> = { project: projectId }
  if (stageTab) params.tab = stageTab
  return quickCutStudioHref(params)
}

/** Parse `?tab=` from a generate URL into a stage tab id. */
export function stageTabFromSearchParams(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): QuickCutStageTab | undefined {
  const tab = searchParams.get('tab')
  return isQuickCutStageTab(tab) ? tab : undefined
}

/** REGENERATE — re-open the same project (UPDATE row, never a new create entry). */
export function regenerateProjectHref(
  projectId: string,
  mode: CreatorMode,
  stageTab: QuickCutStageTab = 'title'
): string {
  if (mode === 'quick') {
    return projectWorkspaceHref(projectId, { tab: stageTab, regen: true })
  }
  return directorWorkspaceHref(projectId)
}

export type OpenProjectHrefOptions = {
  stageTab?: QuickCutStageTab
  videoUrl?: string | null
  hasPlayablePreview?: boolean
}

/** OPEN action — resume editing in the generation workflow, not export/new create. */
export function openProjectHref(
  status: string,
  projectId: string,
  mode?: CreatorMode | string | null,
  options?: OpenProjectHrefOptions
): string {
  const resolvedMode: CreatorMode =
    mode === 'quick' || mode === 'director' ? mode : inferModeFromStatus(status)

  if (resolvedMode === 'quick') {
    const tab =
      options?.stageTab ??
      inferOpenStageTabFromCard({
        status,
        videoUrl: options?.videoUrl,
        hasPlayablePreview: options?.hasPlayablePreview,
      })
    return openQuickCutProjectHref(projectId, tab)
  }

  return projectWorkspaceHref(projectId)
}

export function hrefForProject(
  status: string,
  projectId: string,
  mode?: CreatorMode | string | null
): string {
  const resolvedMode: CreatorMode =
    mode === 'quick' || mode === 'director' ? mode : inferModeFromStatus(status)

  if (resolvedMode === 'quick') {
    if (status === 'compile' || status === 'complete' || isFinishedProjectStatus(status)) {
      return createProjectHref(projectId, 'export')
    }
    return projectWorkspaceHref(projectId)
  }

  const segment = DIRECTOR_STATUS_SEGMENT[status] || 'director'
  return createProjectHref(projectId, segment)
}

export function inferModeFromStatus(status: string): CreatorMode {
  if (
    status === 'preview' ||
    status === 'generating' ||
    status === 'create' ||
    status === 'compile' ||
    status === 'complete' ||
    isFinishedProjectStatus(status)
  ) {
    return 'quick'
  }
  return 'director'
}

/** Map legacy /cinematic/* paths to unified /create routes. */
export function cinematicLegacyRedirectTarget(
  pathname: string,
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): string {
  const projectId = searchParams.get('project')
  const segment = pathname.split('/').filter(Boolean).pop() || 'create'

  if (!projectId) {
    if (segment === 'compile') return `${STUDIO.exports}`
    return directorWorkspaceHref()
  }

  const map: Record<string, CreateSegment> = {
    create: 'director',
    generating: 'director',
    preview: 'generate',
    director: 'director',
    scenes: 'director',
    voiceover: 'director',
    compile: 'export',
  }

  return createProjectHref(projectId, map[segment] || 'director')
}

/** @deprecated Use hrefForProject — kept for gradual migration. */
export function cinematicHrefForProject(
  status: CinematicProjectStatus | string,
  id: string,
  mode?: CreatorMode | string | null
): string {
  return hrefForProject(status, id, mode)
}
