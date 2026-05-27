import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  captionsToPayload,
  parseCaptionsPayload,
  type CaptionsPayload,
} from '@/lib/cinematic/generation'
import {
  sanitizeScenesFromPersistence,
  sanitizeVoiceFromPersistence,
} from '@/lib/cinematic/sanitize-persisted-assets'
import type {
  CinematicProjectState,
  CinematicProjectStatus,
  CinematicScene,
  CinematicVoice,
} from '@/stores/cinematic-project'

export type CinematicProjectRow = {
  id: string
  user_id: string
  title: string
  prompt: string
  style: string
  duration: number
  script: string
  scenes: CinematicScene[] | null
  voice: CinematicVoice | null
  captions: CaptionsPayload | string | null
  status: string
  updated_at: string
  created_at: string
}

export type CinematicProjectSummary = {
  id: string
  title: string
  prompt: string
  style: string
  duration: number
  script: string
  scenes: CinematicScene[]
  voice: CinematicVoice | null
  captions: string
  status: CinematicProjectStatus
  updatedAt: string
  createdAt: string
}

const STATUS_ROUTE: Record<string, string> = {
  idle: 'create',
  create: 'create',
  generating: 'generating',
  preview: 'preview',
  director: 'director',
  scenes: 'scenes',
  voiceover: 'voiceover',
  compile: 'compile',
  complete: 'compile',
}

function parseCaptions(value: CinematicProjectRow['captions']) {
  return parseCaptionsPayload(value)
}

export function rowToState(row: CinematicProjectRow): CinematicProjectState {
  const parsed = parseCaptions(row.captions)
  return {
    id: row.id,
    title: row.title || 'Untitled project',
    prompt: row.prompt || '',
    style: row.style || 'cinematic',
    duration: Number(row.duration) || 60,
    hook: parsed.hook,
    summary: parsed.summary,
    script: row.script || '',
    scenes: sanitizeScenesFromPersistence(
      Array.isArray(row.scenes) ? row.scenes : []
    ),
    voice: sanitizeVoiceFromPersistence(row.voice),
    captions: parsed.text,
    captionLines: parsed.captionLines,
    suggestedVoiceStyle: parsed.suggestedVoiceStyle,
    niche: parsed.niche,
    status: (row.status as CinematicProjectStatus) || 'create',
    updatedAt: row.updated_at,
    persistedId: null,
    saveState: 'idle',
    lastPersistedAt: null,
    isHydrating: false,
  }
}

export function rowToSummary(row: CinematicProjectRow): CinematicProjectSummary {
  return {
    id: row.id,
    title: row.title || 'Untitled project',
    prompt: row.prompt || '',
    style: row.style || 'cinematic',
    duration: Number(row.duration) || 60,
    script: row.script || '',
    scenes: sanitizeScenesFromPersistence(
      Array.isArray(row.scenes) ? row.scenes : []
    ),
    voice: sanitizeVoiceFromPersistence(row.voice),
    captions: parseCaptions(row.captions).text,
    status: (row.status as CinematicProjectStatus) || 'create',
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}

export function stateToRowPayload(
  state: Pick<
    CinematicProjectState,
    | 'id'
    | 'title'
    | 'prompt'
    | 'style'
    | 'duration'
    | 'hook'
    | 'summary'
    | 'script'
    | 'scenes'
    | 'voice'
    | 'captions'
    | 'captionLines'
    | 'suggestedVoiceStyle'
    | 'niche'
    | 'status'
  >
) {
  const cta = state.captionLines[1] || ''
  const hashtags = state.captionLines
    .slice(2)
    .filter((line) => line.startsWith('#'))
    .slice(0, 3)

  return {
    id: state.id ?? undefined,
    title: state.title || 'Untitled project',
    prompt: state.prompt || '',
    style: state.style || 'cinematic',
    duration: state.duration || 60,
    script: state.script || '',
    scenes: state.scenes || [],
    voice: state.voice,
    captions: captionsToPayload({
      hook: state.hook || '',
      summary: state.summary || '',
      captionLines: state.captionLines || [],
      suggestedVoiceStyle: state.suggestedVoiceStyle || 'warm_documentary',
      niche: state.niche,
      cta: cta || undefined,
      hashtags: hashtags.length ? hashtags : undefined,
    }),
    status: state.status || 'create',
    updated_at: new Date().toISOString(),
  }
}

export function cinematicHrefForProject(
  status: string,
  id: string
): string {
  const segment = STATUS_ROUTE[status] || 'create'
  return `/cinematic/${segment}?project=${id}`
}

async function requireUserId(): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Not signed in')
  return user.id
}

export async function createProject(
  state: Partial<CinematicProjectState> & { id?: string },
  userId?: string
): Promise<CinematicProjectRow> {
  const supabase = createSupabaseBrowserClient()
  const uid = userId ?? (await requireUserId())
  const payload = stateToRowPayload({
    id: state.id ?? null,
    title: state.title ?? 'Untitled project',
    prompt: state.prompt ?? '',
    style: state.style ?? 'cinematic',
    duration: state.duration ?? 60,
    hook: state.hook ?? '',
    summary: state.summary ?? '',
    script: state.script ?? '',
    scenes: state.scenes ?? [],
    voice: state.voice ?? null,
    captions: state.captions ?? '',
    captionLines: state.captionLines ?? [],
    suggestedVoiceStyle: state.suggestedVoiceStyle ?? 'warm_documentary',
    niche: state.niche ?? 'storytelling',
    status: state.status ?? 'create',
  })

  const { data, error } = await supabase
    .from('cinematic_projects')
    .insert({ ...payload, user_id: uid })
    .select('*')
    .single()

  if (error) throw error
  return data as CinematicProjectRow
}

export async function updateProject(
  id: string,
  state: Partial<CinematicProjectState>
): Promise<CinematicProjectRow> {
  const supabase = createSupabaseBrowserClient()
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (state.title !== undefined) patch.title = state.title
  if (state.prompt !== undefined) patch.prompt = state.prompt
  if (state.style !== undefined) patch.style = state.style
  if (state.duration !== undefined) patch.duration = state.duration
  if (state.script !== undefined) patch.script = state.script
  if (state.scenes !== undefined) patch.scenes = state.scenes
  if (state.voice !== undefined) patch.voice = state.voice
  if (
    state.captions !== undefined ||
    state.captionLines !== undefined ||
    state.hook !== undefined ||
    state.summary !== undefined ||
    state.suggestedVoiceStyle !== undefined ||
    state.niche !== undefined
  ) {
    const lines = state.captionLines ?? []
    patch.captions = captionsToPayload({
      hook: state.hook ?? '',
      summary: state.summary ?? '',
      captionLines: lines,
      suggestedVoiceStyle: state.suggestedVoiceStyle ?? 'warm_documentary',
      niche: state.niche,
      cta: lines[1],
      hashtags: lines.slice(2).filter((line) => line.startsWith('#')).slice(0, 3),
    })
  }
  if (state.status !== undefined) patch.status = state.status

  const { data, error } = await supabase
    .from('cinematic_projects')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as CinematicProjectRow
}

export async function loadProject(id: string): Promise<CinematicProjectRow> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as CinematicProjectRow
}

export async function loadRecentProjects(
  limit = 8
): Promise<CinematicProjectSummary[]> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as CinematicProjectRow[]).map(rowToSummary)
}
