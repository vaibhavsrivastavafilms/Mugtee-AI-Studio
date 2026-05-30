import { createSupabaseBrowserClient } from '@/lib/supabase/client'

/** Browser Supabase client or throw when public env is missing. */
function requireBrowserClient() {
  const client = createSupabaseBrowserClient()
  if (!client) throw new Error('Authentication is not configured')
  return client
}

/** User-facing hint when migrations 0014–0018 have not been applied. */
export const CINEMATIC_PROJECTS_MIGRATION_HINT =
  'Project library is not set up yet. Run supabase/RUN_IN_SQL_EDITOR.sql (migrations 0014–0018) in the Supabase SQL editor, then retry save.'

/** Supabase Dashboard → SQL Editor link derived from NEXT_PUBLIC_SUPABASE_URL. */
export function getSupabaseSqlEditorUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    const ref = new URL(url).hostname.split('.')[0]
    if (!ref) return null
    return `https://supabase.com/dashboard/project/${ref}/sql/new`
  } catch {
    return null
  }
}

/** True when save failed because cinematic_projects migrations are missing. */
export function isMigrationSaveError(message: string | null | undefined): boolean {
  if (!message) return false
  return (
    message === CINEMATIC_PROJECTS_MIGRATION_HINT ||
    message.includes('RUN_IN_SQL_EDITOR.sql') ||
    message.includes('migrations 0014')
  )
}

/** Thrown when migrations 0014–0018 have not been applied (table or columns missing). */
export class CinematicProjectsUnavailableError extends Error {
  constructor(message = CINEMATIC_PROJECTS_MIGRATION_HINT) {
    super(message)
    this.name = 'CinematicProjectsUnavailableError'
  }
}

/** Detect Supabase/PostgREST errors for a missing cinematic_projects table. */
export function isCinematicProjectsUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string; status?: number; details?: string }
  if (e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST204' || e.code === '42703') return true
  if (e.status === 404) return true
  const msg = `${e.message ?? ''} ${e.details ?? ''}`.toLowerCase()
  return (
    msg.includes('cinematic_projects') &&
    (msg.includes('does not exist') ||
      msg.includes('could not find') ||
      msg.includes('schema cache') ||
      msg.includes('relation'))
  )
}

function throwIfUnavailable(error: unknown): never {
  if (isCinematicProjectsUnavailable(error)) {
    console.warn(
      '[cinematic-projects] Table missing — apply supabase/RUN_IN_SQL_EDITOR.sql (0014–0018, see MIGRATION_RUNBOOK.md)'
    )
    throw new CinematicProjectsUnavailableError()
  }
  throw error
}
import {
  captionsToPayload,
  parseCaptionsPayload,
  type CaptionsPayload,
} from '@/lib/cinematic/generation'
import {
  sanitizeScenesFromPersistence,
  sanitizeVoiceFromPersistence,
} from '@/lib/cinematic/sanitize-persisted-assets'
import { hrefForProject } from '@/lib/create/routes'
import { inferProjectMode } from '@/lib/cinematic/project-mode'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import type { ViralScript, VisualStyle } from '@/lib/cinematic/workflow-state'
import type { VariationHistory } from '@/lib/cinematic/variation-history'
import {
  completedStatus,
  exportedStatus,
  FINISHED_PROJECT_STATUSES,
  isFinishedProjectStatus,
  normalizeProjectStatus,
  reviewingStatus,
} from '@/lib/cinematic/project-status'
import { coerceDuration } from '@/lib/workspace/validation'
import {
  beatsToPayload,
  payloadToBeats,
  resolveCinematicScript,
  deriveScriptText,
} from '@/lib/cinematic/cinematic-script'
import type { ScriptBeatsPayload } from '@/types/cinematic-script'

export { FINISHED_PROJECT_STATUSES, normalizeProjectStatus, isFinishedProjectStatus }
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
  /** Canonical reel-native beats (jsonb). */
  script_beats?: ScriptBeatsPayload | null
  scenes: CinematicScene[] | null
  storyboard?: CinematicScene[] | Record<string, unknown>[] | null
  voice: CinematicVoice | null
  captions: CaptionsPayload | string | null
  status: string
  mode?: string | null
  virlo?: VirloMetadata | Record<string, unknown> | null
  video_url?: string | null
  thumbnail_url?: string | null
  reel_status?: string | null
  reel_url?: string | null
  reel_rendered_at?: string | null
  updated_at: string
  created_at: string
  language?: string | null
  input_type?: string | null
  original_transcript?: string | null
  variation_history?: VariationHistory | Record<string, unknown> | null
  visual_style?: VisualStyle | Record<string, unknown> | null
  viral_script?: ViralScript | Record<string, unknown> | null
  generation_status?: string | null
  generation_step?: string | null
  generation_error?: string | null
  last_completed_step?: string | null
}

export type CinematicProjectSummary = {
  id: string
  title: string
  prompt: string
  hook: string
  style: string
  duration: number
  script: string
  niche: string
  scenes: CinematicScene[]
  voice: CinematicVoice | null
  captions: string
  status: CinematicProjectStatus
  mode: 'quick' | 'director'
  video_url: string | null
  thumbnail_url: string | null
  updatedAt: string
  createdAt: string
}

export type ArchiveGeneratedProjectInput = {
  title: string
  prompt: string
  mode: 'quick' | 'director'
  script: string
  scriptBeats?: ScriptBeatsPayload | null
  payoff?: string
  cta?: string
  scenes: CinematicScene[]
  storyboard?: CinematicScene[] | Record<string, unknown>[]
  voice?: CinematicVoice | null
  duration?: number
  status?: CinematicProjectStatus
  video_url?: string | null
  thumbnail_url?: string | null
  reel_status?: string | null
  reel_url?: string | null
  reel_rendered_at?: string | null
  style?: string
  hook?: string
  summary?: string
  captionLines?: string[]
  suggestedVoiceStyle?: string
  niche?: string
  virlo?: VirloMetadata | Record<string, unknown> | null
  projectId?: string | null
  language?: ProjectLanguage | string
  input_type?: string
  original_transcript?: string
  variation_history?: VariationHistory
  visual_style?: VisualStyle | null
  viral_script?: ViralScript | null
  generation_status?: string | null
  generation_step?: string | null
  generation_error?: string | null
  last_completed_step?: string | null
}

function parseCaptions(value: CinematicProjectRow['captions']) {
  return parseCaptionsPayload(value)
}

/** Prefer `scenes`; fall back to archived `storyboard` mirror when scenes are empty. */
export function resolveProjectScenes(
  row: Pick<CinematicProjectRow, 'scenes' | 'storyboard'>
): CinematicScene[] {
  const fromScenes = Array.isArray(row.scenes) ? row.scenes : []
  const fromStoryboard = Array.isArray(row.storyboard) ? row.storyboard : []
  const raw = fromScenes.length > 0 ? fromScenes : fromStoryboard
  return sanitizeScenesFromPersistence(raw as CinematicScene[])
}

export function projectHasPlayablePreview(
  scenes: CinematicScene[],
  _voice: CinematicVoice | null,
  videoUrl?: string | null
): boolean {
  if (videoUrl?.trim()) return true
  return scenes.some(
    (scene) => scene.imageUrl?.trim() || scene.storyboardImages?.[0]?.url?.trim()
  )
}

export function rowToState(row: CinematicProjectRow): CinematicProjectState {
  const parsed = parseCaptions(row.captions)
  const fromPayload = payloadToBeats(row.script_beats)
  const cinematicScript = resolveCinematicScript({
    scriptBeats: row.script_beats,
    script: row.script,
    hook: parsed.hook,
    payoff: fromPayload.payoff || parsed.cta,
    cta: fromPayload.cta || parsed.cta,
  })
  const derivedScript =
    row.script?.trim() || deriveScriptText(cinematicScript)

  return {
    id: row.id,
    title: row.title || 'Untitled project',
    prompt: row.prompt || '',
    style: row.style || 'cinematic',
    duration: coerceDuration(row.duration),
    hook: cinematicScript.hook || parsed.hook,
    summary: parsed.summary,
    script: derivedScript,
    scriptBeats: cinematicScript.scriptBeats,
    payoff: cinematicScript.payoff,
    cta: cinematicScript.cta,
    scenes: resolveProjectScenes(row),
    voice: sanitizeVoiceFromPersistence(row.voice),
    captions: parsed.text,
    captionLines: parsed.captionLines,
    suggestedVoiceStyle: parsed.suggestedVoiceStyle,
    niche: parsed.niche,
    status: normalizeProjectStatus(row.status),
    updatedAt: row.updated_at,
    persistedId: null,
    saveState: 'idle',
    lastPersistedAt: null,
    isHydrating: false,
  }
}

function resolveThumbnail(
  thumbnailUrl: string | null | undefined,
  scenes: CinematicScene[]
): string | null {
  if (thumbnailUrl) return thumbnailUrl
  const thumbScene = scenes.find(
    (scene) => scene.storyboardImages?.[0]?.url || scene.imageUrl
  )
  return (
    thumbScene?.storyboardImages?.find(
      (img) => img.id === thumbScene.activeStoryboardId
    )?.url ||
    thumbScene?.storyboardImages?.[0]?.url ||
    thumbScene?.imageUrl ||
    null
  )
}

export function rowToSummary(row: CinematicProjectRow): CinematicProjectSummary {
  const scenes = resolveProjectScenes(row)
  const parsedCaptions = parseCaptions(row.captions)
  return {
    id: row.id,
    title: row.title || 'Untitled project',
    prompt: row.prompt || '',
    hook: parsedCaptions.hook,
    style: row.style || 'cinematic',
    duration: coerceDuration(row.duration),
    script: row.script || '',
    niche: parsedCaptions.niche || 'storytelling',
    scenes,
    voice: sanitizeVoiceFromPersistence(row.voice),
    captions: parsedCaptions.text,
    status: normalizeProjectStatus(row.status),
    mode: inferProjectMode(row),
    video_url: row.video_url ?? null,
    thumbnail_url: resolveThumbnail(row.thumbnail_url, scenes),
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
  > &
    Partial<Pick<CinematicProjectState, 'scriptBeats' | 'payoff' | 'cta'>> & {
      mode?: 'quick' | 'director'
    }
) {
  const cta = state.cta || state.captionLines[1] || ''
  const hashtags = state.captionLines
    .slice(2)
    .filter((line) => line.startsWith('#'))
    .slice(0, 3)

  const cinematicScript = resolveCinematicScript({
    scriptBeats: state.scriptBeats?.length
      ? beatsToPayload({
          scriptBeats: state.scriptBeats,
          payoff: state.payoff ?? '',
          cta: state.cta ?? '',
        })
      : null,
    script: state.script,
    hook: state.hook,
    payoff: state.payoff,
    cta: state.cta,
  })

  return {
    id: state.id ?? undefined,
    title: state.title || 'Untitled project',
    prompt: state.prompt || '',
    style: state.style || 'cinematic',
    duration: state.duration || 60,
    script: deriveScriptText(cinematicScript) || state.script || '',
    script_beats: cinematicScript.scriptBeats.length
      ? beatsToPayload(cinematicScript)
      : null,
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
    mode: state.mode ?? 'director',
    updated_at: new Date().toISOString(),
  }
}

/** Resolve unified /create route for a persisted project. */
export function cinematicHrefForProject(
  status: string,
  id: string,
  mode?: string | null
): string {
  return hrefForProject(status, id, mode)
}

async function requireUserId(): Promise<string> {
  const supabase = requireBrowserClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Not signed in')
  return user.id
}

export async function createProject(
  state: Omit<Partial<CinematicProjectState>, 'id'> & {
    id?: string
    mode?: 'quick' | 'director'
    video_url?: string | null
    thumbnail_url?: string | null
    storyboard?: unknown
    virlo?: unknown
    language?: string
    input_type?: string
    original_transcript?: string
    variation_history?: unknown
    visual_style?: unknown
    viral_script?: unknown
  },
  userId?: string
): Promise<CinematicProjectRow> {
  const supabase = requireBrowserClient()
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
    scriptBeats: state.scriptBeats ?? [],
    payoff: state.payoff ?? '',
    cta: state.cta ?? '',
    scenes: state.scenes ?? [],
    voice: state.voice ?? null,
    captions: state.captions ?? '',
    captionLines: state.captionLines ?? [],
    suggestedVoiceStyle: state.suggestedVoiceStyle ?? 'warm_documentary',
    niche: state.niche ?? 'storytelling',
    status: state.status ?? 'create',
    mode: state.mode ?? 'director',
  })

  const insertRow: Record<string, unknown> = { ...payload, user_id: uid }
  if (state.video_url !== undefined) insertRow.video_url = state.video_url
  if (state.thumbnail_url !== undefined) insertRow.thumbnail_url = state.thumbnail_url
  if (state.storyboard !== undefined) insertRow.storyboard = state.storyboard
  if (state.virlo !== undefined) insertRow.virlo = state.virlo
  if (state.language !== undefined) insertRow.language = state.language
  if (state.input_type !== undefined) insertRow.input_type = state.input_type
  if (state.original_transcript !== undefined) {
    insertRow.original_transcript = state.original_transcript
  }
  if (state.variation_history !== undefined) {
    insertRow.variation_history = state.variation_history
  }
  if (state.visual_style !== undefined) insertRow.visual_style = state.visual_style
  if (state.viral_script !== undefined) insertRow.viral_script = state.viral_script
  if ((state as { generation_status?: string }).generation_status !== undefined) {
    insertRow.generation_status = (state as { generation_status?: string }).generation_status
  }
  if ((state as { generation_step?: string }).generation_step !== undefined) {
    insertRow.generation_step = (state as { generation_step?: string }).generation_step
  }
  if ((state as { generation_error?: string | null }).generation_error !== undefined) {
    insertRow.generation_error = (state as { generation_error?: string | null }).generation_error
  }
  if ((state as { last_completed_step?: string | null }).last_completed_step !== undefined) {
    insertRow.last_completed_step = (state as { last_completed_step?: string | null }).last_completed_step
  }

  const { data, error } = await supabase
    .from('cinematic_projects')
    .insert(insertRow)
    .select('*')
    .single()

  if (error) throwIfUnavailable(error)
  return data as CinematicProjectRow
}

export async function updateProject(
  id: string,
  state: Partial<CinematicProjectState>
): Promise<CinematicProjectRow> {
  const supabase = requireBrowserClient()
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (state.title !== undefined) patch.title = state.title
  if (state.prompt !== undefined) patch.prompt = state.prompt
  if (state.style !== undefined) patch.style = state.style
  if (state.duration !== undefined) patch.duration = state.duration
  if (state.script !== undefined) patch.script = state.script
  if (state.scriptBeats !== undefined || state.payoff !== undefined || state.cta !== undefined) {
    const cinematicScript = resolveCinematicScript({
      scriptBeats: state.scriptBeats?.length
        ? beatsToPayload({
            scriptBeats: state.scriptBeats,
            payoff: state.payoff ?? '',
            cta: state.cta ?? '',
          })
        : null,
      script: state.script,
      hook: state.hook ?? '',
      payoff: state.payoff,
      cta: state.cta,
    })
    patch.script_beats = cinematicScript.scriptBeats.length
      ? beatsToPayload(cinematicScript)
      : null
    if (state.script === undefined && cinematicScript.scriptBeats.length) {
      patch.script = deriveScriptText(cinematicScript)
    }
  }
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
  if ((state as { mode?: string }).mode !== undefined) {
    patch.mode = (state as { mode?: string }).mode
  }
  if ((state as { video_url?: string | null }).video_url !== undefined) {
    patch.video_url = (state as { video_url?: string | null }).video_url
  }
  if ((state as { thumbnail_url?: string | null }).thumbnail_url !== undefined) {
    patch.thumbnail_url = (state as { thumbnail_url?: string | null }).thumbnail_url
  }
  if ((state as { storyboard?: unknown }).storyboard !== undefined) {
    patch.storyboard = (state as { storyboard?: unknown }).storyboard
  }
  if ((state as { virlo?: unknown }).virlo !== undefined) {
    patch.virlo = (state as { virlo?: unknown }).virlo
  }
  if ((state as { language?: string }).language !== undefined) {
    patch.language = (state as { language?: string }).language
  }
  if ((state as { input_type?: string }).input_type !== undefined) {
    patch.input_type = (state as { input_type?: string }).input_type
  }
  if ((state as { original_transcript?: string }).original_transcript !== undefined) {
    patch.original_transcript = (state as { original_transcript?: string }).original_transcript
  }
  if ((state as { variation_history?: unknown }).variation_history !== undefined) {
    patch.variation_history = (state as { variation_history?: unknown }).variation_history
  }
  if ((state as { visual_style?: unknown }).visual_style !== undefined) {
    patch.visual_style = (state as { visual_style?: unknown }).visual_style
  }
  if ((state as { viral_script?: unknown }).viral_script !== undefined) {
    patch.viral_script = (state as { viral_script?: unknown }).viral_script
  }
  if ((state as { generation_status?: string }).generation_status !== undefined) {
    patch.generation_status = (state as { generation_status?: string }).generation_status
  }
  if ((state as { generation_step?: string }).generation_step !== undefined) {
    patch.generation_step = (state as { generation_step?: string }).generation_step
  }
  if ((state as { generation_error?: string | null }).generation_error !== undefined) {
    patch.generation_error = (state as { generation_error?: string | null }).generation_error
  }
  if ((state as { last_completed_step?: string | null }).last_completed_step !== undefined) {
    patch.last_completed_step = (state as { last_completed_step?: string | null }).last_completed_step
  }

  const { data, error } = await supabase
    .from('cinematic_projects')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throwIfUnavailable(error)
  return data as CinematicProjectRow
}

export async function loadProject(id: string): Promise<CinematicProjectRow> {
  const supabase = requireBrowserClient()
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throwIfUnavailable(error)
  return data as CinematicProjectRow
}

export type RecentProjectsLoadResult = {
  projects: CinematicProjectSummary[]
  /** True when migrations 0014–0018 have not been applied (missing table). */
  tableUnavailable: boolean
}

export type LoadRecentProjectsOptions = {
  limit?: number
  /** When set, only return projects with these statuses */
  statuses?: readonly string[]
  mode?: 'quick' | 'director'
}

export async function loadRecentProjects(
  options: LoadRecentProjectsOptions | number = 8
): Promise<RecentProjectsLoadResult> {
  const opts: LoadRecentProjectsOptions =
    typeof options === 'number' ? { limit: options } : options
  const limit = opts.limit ?? 8

  const supabase = requireBrowserClient()
  let query = supabase.from('cinematic_projects').select('*')

  if (opts.statuses?.length) {
    query = query.in('status', [...opts.statuses])
  }
  if (opts.mode) {
    query = query.eq('mode', opts.mode)
  }

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (isCinematicProjectsUnavailable(error)) {
      console.warn(
        '[cinematic-projects] Table missing — apply supabase/RUN_IN_SQL_EDITOR.sql (0014–0018, see MIGRATION_RUNBOOK.md)'
      )
      return { projects: [], tableUnavailable: true }
    }
    throw error
  }
  return {
    projects: (data as CinematicProjectRow[]).map(rowToSummary),
    tableUnavailable: false,
  }
}

/** Auto-save a completed or in-progress generation into the unified project library. */
export async function archiveGeneratedProject(
  input: ArchiveGeneratedProjectInput
): Promise<CinematicProjectRow> {
  const scenes = input.scenes ?? []
  const thumbnail = resolveThumbnail(input.thumbnail_url, scenes)
  const status =
    input.status ??
    (input.video_url ? completedStatus() : reviewingStatus())
  const payload = stateToRowPayload({
    id: input.projectId ?? null,
    title: input.title || 'Untitled reel',
    prompt: input.prompt || '',
    style: input.style ?? 'cinematic',
    duration: input.duration ?? 60,
    hook: input.hook ?? '',
    summary: input.summary ?? input.hook ?? '',
    script: input.script ?? '',
    scriptBeats: input.scriptBeats ? payloadToBeats(input.scriptBeats).beats : [],
    payoff: input.payoff ?? payloadToBeats(input.scriptBeats).payoff,
    cta: input.cta ?? payloadToBeats(input.scriptBeats).cta,
    scenes,
    voice: input.voice ?? null,
    captions: input.captionLines?.join('\n') ?? '',
    captionLines: input.captionLines ?? [],
    suggestedVoiceStyle: input.suggestedVoiceStyle ?? 'warm_documentary',
    niche: input.niche ?? 'storytelling',
    status,
    mode: input.mode,
  })

  type ArchivePatch = Partial<CinematicProjectState> & {
    mode?: 'quick' | 'director'
    video_url?: string | null
    thumbnail_url?: string | null
    storyboard?: unknown
    virlo?: unknown
    language?: string
    input_type?: string
    original_transcript?: string
    variation_history?: unknown
    visual_style?: unknown
    viral_script?: unknown
    generation_status?: string | null
    generation_step?: string | null
    generation_error?: string | null
    last_completed_step?: string | null
  }

  const archivePatch: ArchivePatch = {
    title: payload.title,
    prompt: payload.prompt,
    style: payload.style,
    duration: payload.duration,
    script: payload.script,
    scriptBeats: input.scriptBeats
      ? payloadToBeats(input.scriptBeats).beats
      : payloadToBeats(payload.script_beats as ScriptBeatsPayload | null).beats,
    payoff: input.payoff ?? payloadToBeats(input.scriptBeats ?? payload.script_beats).payoff,
    cta: input.cta ?? payloadToBeats(input.scriptBeats ?? payload.script_beats).cta,
    scenes: payload.scenes as CinematicScene[],
    voice: payload.voice as CinematicVoice | null,
    captions: input.captionLines?.join('\n') ?? '',
    captionLines: input.captionLines ?? [],
    suggestedVoiceStyle: input.suggestedVoiceStyle ?? 'warm_documentary',
    niche: input.niche ?? 'storytelling',
    status: status as CinematicProjectStatus,
    mode: input.mode,
    video_url: input.video_url ?? null,
    thumbnail_url: thumbnail,
    storyboard: input.storyboard ?? scenes,
    virlo: input.virlo ?? null,
    language: input.language,
    input_type: input.input_type,
    original_transcript: input.original_transcript,
    variation_history: input.variation_history ?? null,
    visual_style: input.visual_style ?? null,
    viral_script: input.viral_script ?? null,
    generation_status: input.generation_status ?? null,
    generation_step: input.generation_step ?? null,
    generation_error: input.generation_error ?? null,
    last_completed_step: input.last_completed_step ?? null,
  }

  if (input.projectId) {
    return await updateProject(input.projectId, archivePatch)
  }

  return await createProject(
    {
      title: payload.title,
      prompt: payload.prompt,
      style: payload.style,
      duration: payload.duration,
      hook: input.hook ?? '',
      summary: input.summary ?? input.hook ?? '',
      script: payload.script,
      scriptBeats: payloadToBeats(input.scriptBeats ?? payload.script_beats).beats,
      payoff: input.payoff ?? '',
      cta: input.cta ?? '',
      scenes: payload.scenes as CinematicScene[],
      voice: payload.voice as CinematicVoice | null,
      captions: input.captionLines?.join('\n') ?? '',
      captionLines: input.captionLines ?? [],
      suggestedVoiceStyle: input.suggestedVoiceStyle ?? 'warm_documentary',
      niche: input.niche ?? 'storytelling',
      status: status as CinematicProjectStatus,
      mode: input.mode,
      video_url: input.video_url ?? null,
      thumbnail_url: thumbnail,
      storyboard: input.storyboard ?? scenes,
      virlo: input.virlo ?? null,
      language: input.language,
      input_type: input.input_type,
      original_transcript: input.original_transcript,
      variation_history: input.variation_history ?? null,
      visual_style: input.visual_style ?? null,
      viral_script: input.viral_script ?? null,
      generation_status: input.generation_status ?? null,
      generation_step: input.generation_step ?? null,
      generation_error: input.generation_error ?? null,
      last_completed_step: input.last_completed_step ?? null,
    } as Parameters<typeof createProject>[0],
    undefined
  )
}

/** Persist render output metadata on an existing project (client-side fallback). */
export async function saveProjectRenderOutput(
  projectId: string,
  input: {
    video_url: string
    thumbnail_url?: string | null
    status?: CinematicProjectStatus
    duration?: number
    reel_url?: string
    reel_status?: string
  }
): Promise<CinematicProjectRow> {
  return await updateProject(projectId, {
    status: input.status ?? completedStatus(),
    duration: input.duration,
    video_url: input.video_url,
    thumbnail_url: input.thumbnail_url ?? null,
    reel_url: input.reel_url ?? input.video_url,
    reel_status: input.reel_status ?? 'ready',
  } as Partial<CinematicProjectState> & {
    video_url?: string | null
    thumbnail_url?: string | null
    reel_url?: string | null
    reel_status?: string | null
  })
}
