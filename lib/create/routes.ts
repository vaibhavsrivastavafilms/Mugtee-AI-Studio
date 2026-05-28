import type { CinematicProjectStatus } from '@/stores/cinematic-project'

export type CreatorMode = 'quick' | 'director'

export type CreateSegment = 'generate' | 'director' | 'export'

/** Canonical Quick Cut surface — fast one-click generation. */
export function quickCutStudioHref(
  params?: Record<string, string | undefined>
): string {
  const qs = new URLSearchParams({ mode: 'quick' })
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value)
    }
  }
  const q = qs.toString()
  return `/create?${q}`
}

/** Project continuity route — resolves to the correct mode surface. */
export function projectContinuityHref(projectId: string): string {
  return `/project/${projectId}`
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
  return q ? `/workspace?${q}` : '/workspace'
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
  return q ? `/create?${q}` : '/create'
}

/** Redirect legacy /create?mode=director to the workspace canvas. Quick Cut stays on /create. */
export function legacyCreateRedirectTarget(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): string | null {
  const mode = searchParams.get('mode')
  if (mode === 'director') return directorWorkspaceHref()
  return null
}

export function createProjectHref(
  projectId: string,
  segment: CreateSegment = 'director'
): string {
  if (segment === 'director') {
    return directorWorkspaceHref(projectId)
  }
  return `/create/${projectId}/${segment}`
}

export function hrefForProject(
  status: string,
  projectId: string,
  mode?: CreatorMode | string | null
): string {
  const resolvedMode: CreatorMode =
    mode === 'quick' || mode === 'director' ? mode : inferModeFromStatus(status)

  if (resolvedMode === 'quick') {
    if (status === 'compile' || status === 'complete') {
      return createProjectHref(projectId, 'export')
    }
    return createProjectHref(projectId, 'generate')
  }

  const segment = DIRECTOR_STATUS_SEGMENT[status] || 'director'
  return createProjectHref(projectId, segment)
}

export function inferModeFromStatus(status: string): CreatorMode {
  if (status === 'preview' || status === 'generating') return 'quick'
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
    if (segment === 'compile') return createEntryHref(undefined, { tab: 'projects', filter: 'downloaded' })
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
