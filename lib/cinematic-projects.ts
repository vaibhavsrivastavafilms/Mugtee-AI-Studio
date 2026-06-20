import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  readProjectHydrationCache,
  writeProjectHydrationCache,
} from '@/lib/cinematic/project-hydration-cache.client'
import {
  checkClientUsage,
  incrementClientUsage,
} from '@/lib/usage/plan-limit-toast.client'
import { PLAN_LIMIT_MESSAGE } from '@/lib/usage/usage-tracker'

/** Browser Supabase client or throw when public env is missing. */
function requireBrowserClient() {
  const client = createSupabaseBrowserClient()
  if (!client) throw new Error('Authentication is not configured')
  return client
}

/** User-facing hint when the cinematic_projects table has not been created. */
export const CINEMATIC_PROJECTS_MIGRATION_HINT_TABLE =
  'Project library is not set up yet. Run supabase/RUN_IN_SQL_EDITOR.sql in the Supabase SQL editor (cinematic_projects migrations 0014–0049), then retry save.'

/** @deprecated Use {@link CINEMATIC_PROJECTS_MIGRATION_HINT_TABLE} or {@link getCinematicProjectsMigrationHint}. */
export const CINEMATIC_PROJECTS_MIGRATION_HINT = CINEMATIC_PROJECTS_MIGRATION_HINT_TABLE

export type CinematicProjectsErrorKind = 'table' | 'column' | 'rls' | 'other'

export type CinematicProjectsErrorInfo = {
  kind: CinematicProjectsErrorKind
  column?: string
  hint: string
}

/** Columns added after core 0014–0022 — safe to omit on retry when schema is behind. */
const OPTIONAL_CINEMATIC_PROJECT_COLUMNS = new Set([
  'story_bible',
  'scene_motion',
  'reel_job_id',
  'share_as_showcase',
  'creative_brief',
  'director_notes',
  'director_session_counts',
  'workspace_layout',
  'timeline_state',
  'timeline_json',
  'panel_preferences',
  'style_template_id',
])

const COLUMN_MIGRATION: Record<string, string> = {
  video_url: '0015',
  thumbnail_url: '0015',
  mode: '0016',
  virlo: '0016',
  storyboard: '0017',
  language: '0018',
  input_type: '0018',
  original_transcript: '0018',
  variation_history: '0018',
  visual_style: '0018',
  viral_script: '0018',
  generation_status: '0019',
  generation_step: '0019',
  generation_error: '0019',
  last_completed_step: '0019',
  script_beats: '0021',
  reel_status: '0022',
  reel_url: '0022',
  reel_rendered_at: '0022',
  share_as_showcase: '0023',
  reel_job_id: '0032',
  story_bible: '0035',
  scene_motion: '0038',
  creative_brief: '0039',
  director_notes: '0039',
  director_session_counts: '0039',
  workspace_layout: '0037',
  timeline_state: '0037',
  timeline_json: '0047',
  panel_preferences: '0037',
  style_template_id: '0049',
}

/** Optional columns confirmed missing in this browser session — skip on later saves. */
const omittedOptionalColumns = new Set<string>()
const warnedOptionalColumns = new Set<string>()

function stripOmittedOptionalColumns(payload: Record<string, unknown>): void {
  for (const col of omittedOptionalColumns) {
    delete payload[col]
  }
}

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

function extractMissingColumn(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as { message?: string; details?: string; hint?: string }
  const msg = `${e.message ?? ''} ${e.details ?? ''} ${e.hint ?? ''}`
  const schemaCache = msg.match(/Could not find the '([^']+)' column/i)
  if (schemaCache?.[1]) return schemaCache[1]
  const pgCol = msg.match(/column "([^"]+)" (?:of relation|does not exist)/i)
  if (pgCol?.[1]) return pgCol[1]
  return undefined
}

function buildColumnMigrationHint(column: string): string {
  const migration = COLUMN_MIGRATION[column]
  const migrationNote = migration ? ` (migration ${migration})` : ''
  return `Project library needs a database update. Re-run supabase/RUN_IN_SQL_EDITOR.sql in the Supabase SQL editor — missing column: ${column}${migrationNote}. Local preview still works.`
}

/** Classify Supabase/PostgREST errors for cinematic_projects save/load. */
export function classifyCinematicProjectsError(
  error: unknown
): CinematicProjectsErrorInfo | null {
  if (!error || typeof error !== 'object') return null
  const e = error as { code?: string; message?: string; status?: number; details?: string }
  const msg = `${e.message ?? ''} ${e.details ?? ''}`.toLowerCase()

  if (
    e.code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('rls policy') ||
    msg.includes('violates row-level security')
  ) {
    return {
      kind: 'rls',
      hint:
        'Project save blocked by database permissions. Re-run the RLS policy block in supabase/RUN_IN_SQL_EDITOR.sql (migration 0014), then retry save.',
    }
  }

  const missingColumn = extractMissingColumn(error)
  if (e.code === 'PGRST204' || e.code === '42703' || missingColumn) {
    const column = missingColumn ?? 'unknown'
    return {
      kind: 'column',
      column,
      hint: buildColumnMigrationHint(column),
    }
  }

  if (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    e.status === 404 ||
    (msg.includes('cinematic_projects') &&
      (msg.includes('does not exist') ||
        msg.includes('could not find') ||
        msg.includes('schema cache') ||
        msg.includes('relation')))
  ) {
    return {
      kind: 'table',
      hint: CINEMATIC_PROJECTS_MIGRATION_HINT_TABLE,
    }
  }

  return null
}

/** User-facing migration hint for a cinematic_projects save failure. */
export function getCinematicProjectsMigrationHint(error: unknown): string {
  return classifyCinematicProjectsError(error)?.hint ?? CINEMATIC_PROJECTS_MIGRATION_HINT_TABLE
}

/** True when save failed because cinematic_projects migrations are missing. */
export function isMigrationSaveError(message: string | null | undefined): boolean {
  if (!message) return false
  return (
    message === CINEMATIC_PROJECTS_MIGRATION_HINT_TABLE ||
    message === CINEMATIC_PROJECTS_MIGRATION_HINT ||
    message.includes('RUN_IN_SQL_EDITOR.sql') ||
    message.includes('Project library')
  )
}

/** Thrown when cinematic_projects schema is not ready for save. */
export class CinematicProjectsUnavailableError extends Error {
  readonly kind: CinematicProjectsErrorKind
  readonly column?: string

  constructor(info: CinematicProjectsErrorInfo | string = CINEMATIC_PROJECTS_MIGRATION_HINT_TABLE) {
    if (typeof info === 'string') {
      super(info)
      this.kind = 'table'
    } else {
      super(info.hint)
      this.kind = info.kind
      this.column = info.column
    }
    this.name = 'CinematicProjectsUnavailableError'
  }
}

/** Detect Supabase/PostgREST errors when cinematic_projects is unavailable. */
export function isCinematicProjectsUnavailable(error: unknown): boolean {
  const info = classifyCinematicProjectsError(error)
  return info !== null && info.kind !== 'other'
}

function throwIfUnavailable(error: unknown): never {
  const info = classifyCinematicProjectsError(error)
  if (info) {
    console.warn('[cinematic-projects]', info.kind, info.column ?? '', '— apply supabase/RUN_IN_SQL_EDITOR.sql')
    throw new CinematicProjectsUnavailableError(info)
  }
  throw error
}

async function mutateCinematicProjectRow(
  operation: 'insert' | 'update',
  row: Record<string, unknown>,
  updateId?: string
): Promise<CinematicProjectRow> {
  const supabase = requireBrowserClient()
  let payload = { ...row }
  stripOmittedOptionalColumns(payload)
  const maxAttempts = OPTIONAL_CINEMATIC_PROJECT_COLUMNS.size + 2

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result =
      operation === 'insert'
        ? await supabase.from('cinematic_projects').insert(payload).select('*').single()
        : await supabase
            .from('cinematic_projects')
            .update(payload)
            .eq('id', updateId!)
            .select('*')
            .single()

    if (!result.error) return result.data as CinematicProjectRow

    const info = classifyCinematicProjectsError(result.error)
    if (
      info?.kind === 'column' &&
      info.column &&
      OPTIONAL_CINEMATIC_PROJECT_COLUMNS.has(info.column) &&
      info.column in payload
    ) {
      delete payload[info.column]
      omittedOptionalColumns.add(info.column)
      if (!warnedOptionalColumns.has(info.column)) {
        warnedOptionalColumns.add(info.column)
        console.warn(
          `[cinematic-projects] Optional column unavailable (${info.column}); saves omit it until migration ${COLUMN_MIGRATION[info.column] ?? '0037+'} is applied.`
        )
      }
      continue
    }

    throwIfUnavailable(result.error)
  }

  throw new Error('Could not save project after retrying without optional columns')
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
import type { RepurposedAssetsMap } from '@/lib/cinematic/content-repurpose'
import { timelineStateFromReelTimeline } from '@/lib/reel/parse-reel-timeline'

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
  reel_job_id?: string | null
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
  story_bible?: import('@/lib/cinematic/story-bible').StoryBible | Record<string, unknown> | null
  /** Selected style template slug (migration 0049). */
  style_template_id?: string | null
  /** Per-scene motion preset map (migration 0038). */
  scene_motion?: import('@/lib/motion/motion-presets').SceneMotionMap | Record<string, unknown> | null
  /** Reel composer timeline (migration 0037). */
  timeline_state?: Record<string, unknown> | null
  /** Mugtee Timeline Editor JSON (migration 0047). */
  timeline_json?: Record<string, unknown> | null
  /** Opt-in public homepage gallery (default false). */
  share_as_showcase?: boolean
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
  reel_job_id?: string | null
  style?: string
  hook?: string
  summary?: string
  captionLines?: string[]
  suggestedVoiceStyle?: string
  niche?: string
  virlo?: VirloMetadata | Record<string, unknown> | null
  projectId?: string | null
  language?: ProjectLanguage | string
  directorMode?: import('@/lib/cinematic/director-modes').DirectorMode
  blueprintId?: string | null
  styleTemplateId?: string | null
  series?: import('@/lib/cinematic/content-series').ContentSeries | null
  input_type?: string
  original_transcript?: string
  variation_history?: VariationHistory
  visual_style?: VisualStyle | null
  viral_script?: ViralScript | null
  generation_status?: string | null
  generation_step?: string | null
  generation_error?: string | null
  last_completed_step?: string | null
  story_bible?: import('@/lib/cinematic/story-bible').StoryBible | null
  scene_motion?: import('@/lib/motion/motion-presets').SceneMotionMap | null
  repurposedAssets?: RepurposedAssetsMap
  archetypeId?: string | null
  archetypeLabel?: string | null
  archetypeDisplay?: string | null
  narrativeArchetype?: string | null
  narrativeArchetypeLabel?: string | null
  narrativeStructureLabels?: string[] | null
  narrativeFlowDisplay?: string | null
  contentAngleId?: string | null
  contentAngleLabel?: string | null
  hookFramework?: string | null
  hookFrameworkLabel?: string | null
  scene_blueprints?: import('@/lib/cinematic/scene-blueprint').SceneBlueprint[]
  output_alignment_controls?: import('@/lib/cinematic/scene-blueprint').OutputAlignmentControls
  timeline_state?: Record<string, unknown> | null
  timeline_json?: Record<string, unknown> | null
}

function parseCaptions(value: CinematicProjectRow['captions']) {
  return parseCaptionsPayload(value)
}

/** Prefer `scenes`; fall back to `storyboard` when scenes are empty or lack export stills. */
export function resolveProjectScenes(
  row: Pick<CinematicProjectRow, 'scenes' | 'storyboard'>
): CinematicScene[] {
  const fromScenes = Array.isArray(row.scenes) ? row.scenes : []
  const fromStoryboard = Array.isArray(row.storyboard) ? row.storyboard : []
  const sceneHasStills = (s: CinematicScene | Record<string, unknown>) => {
    const row = s as CinematicScene
    return Boolean(row.imageUrl?.trim()) || Boolean(row.imageAssetPath?.trim())
  }
  const scenesWithStills = fromScenes.filter(sceneHasStills).length
  const storyboardWithStills = fromStoryboard.filter(sceneHasStills).length
  const raw =
    fromScenes.length > 0 && (scenesWithStills > 0 || storyboardWithStills === 0)
      ? fromScenes
      : fromStoryboard.length > 0
        ? fromStoryboard
        : fromScenes
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

export function resolveThumbnail(
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
      repurposedAssets: (state as { repurposedAssets?: RepurposedAssetsMap }).repurposedAssets,
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
    directorMode?: import('@/lib/cinematic/director-modes').DirectorMode
    blueprintId?: string | null
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
  const uid = userId ?? (await requireUserId())

  const allowed = await checkClientUsage('projects')
  if (!allowed) throw new Error(PLAN_LIMIT_MESSAGE)

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
  if ((state as { story_bible?: unknown }).story_bible !== undefined) {
    insertRow.story_bible = (state as { story_bible?: unknown }).story_bible
  }
  if ((state as { styleTemplateId?: string | null }).styleTemplateId !== undefined) {
    insertRow.style_template_id = (state as { styleTemplateId?: string | null }).styleTemplateId
  }
  if ((state as { scene_motion?: unknown }).scene_motion !== undefined) {
    insertRow.scene_motion = (state as { scene_motion?: unknown }).scene_motion
  }
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
  if ((state as { directorMode?: string }).directorMode !== undefined) {
    const lines = state.captionLines ?? []
    insertRow.captions = captionsToPayload({
      hook: state.hook ?? '',
      summary: state.summary ?? '',
      captionLines: lines,
      suggestedVoiceStyle: state.suggestedVoiceStyle ?? 'warm_documentary',
      niche: state.niche,
      cta: lines[1],
      hashtags: lines.slice(2).filter((line) => line.startsWith('#')).slice(0, 3),
      directorMode: (state as { directorMode?: string }).directorMode,
      blueprintId:
        (state as { blueprintId?: string | null }).blueprintId ?? undefined,
      series: (state as CinematicProjectPatch).series ?? undefined,
    })
  } else if ((state as { blueprintId?: string | null }).blueprintId !== undefined) {
    const lines = state.captionLines ?? []
    insertRow.captions = captionsToPayload({
      hook: state.hook ?? '',
      summary: state.summary ?? '',
      captionLines: lines,
      suggestedVoiceStyle: state.suggestedVoiceStyle ?? 'warm_documentary',
      niche: state.niche,
      cta: lines[1],
      hashtags: lines.slice(2).filter((line) => line.startsWith('#')).slice(0, 3),
      blueprintId:
        (state as { blueprintId?: string | null }).blueprintId ?? undefined,
      series: (state as CinematicProjectPatch).series ?? undefined,
    })
  } else if ((state as CinematicProjectPatch).series !== undefined) {
    const lines = state.captionLines ?? []
    insertRow.captions = captionsToPayload({
      hook: state.hook ?? '',
      summary: state.summary ?? '',
      captionLines: lines,
      suggestedVoiceStyle: state.suggestedVoiceStyle ?? 'warm_documentary',
      niche: state.niche,
      cta: lines[1],
      hashtags: lines.slice(2).filter((line) => line.startsWith('#')).slice(0, 3),
      series: (state as CinematicProjectPatch).series ?? undefined,
    })
  } else if ((state as CinematicProjectPatch).repurposedAssets !== undefined) {
    const lines = state.captionLines ?? []
    insertRow.captions = captionsToPayload({
      hook: state.hook ?? '',
      summary: state.summary ?? '',
      captionLines: lines,
      suggestedVoiceStyle: state.suggestedVoiceStyle ?? 'warm_documentary',
      niche: state.niche,
      cta: lines[1],
      hashtags: lines.slice(2).filter((line) => line.startsWith('#')).slice(0, 3),
      repurposedAssets: (state as CinematicProjectPatch).repurposedAssets,
    })
  }

  const data = await mutateCinematicProjectRow('insert', insertRow)
  void incrementClientUsage('projects')
  return data
}

export type CinematicProjectPatch = Partial<CinematicProjectState> & {
  share_as_showcase?: boolean
  series?: import('@/lib/cinematic/content-series').ContentSeries | null
  repurposedAssets?: RepurposedAssetsMap
  story_bible?: import('@/lib/cinematic/story-bible').StoryBible | null
  scene_motion?: import('@/lib/motion/motion-presets').SceneMotionMap | null
  visual_style?: VisualStyle | Record<string, unknown> | null
  sceneBlueprints?: import('@/lib/cinematic/scene-blueprint').SceneBlueprint[]
  outputAlignmentControls?: import('@/lib/cinematic/scene-blueprint').OutputAlignmentControls
  reelTimeline?: import('@/lib/reel/types').ReelTimeline | null
  timeline_state?: Record<string, unknown> | null
  timeline_json?: import('@/types/timeline').TimelineProject | Record<string, unknown> | null
  directorMode?: import('@/lib/cinematic/director-modes').DirectorMode
  blueprintId?: string | null
  styleTemplateId?: string | null
  archetypeId?: string | null
  archetypeLabel?: string | null
  archetypeDisplay?: string | null
}

export async function updateProject(
  id: string,
  state: CinematicProjectPatch
): Promise<CinematicProjectRow> {
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
    state.niche !== undefined ||
    (state as { directorMode?: string }).directorMode !== undefined ||
    (state as { blueprintId?: string | null }).blueprintId !== undefined ||
    (state as { styleTemplateId?: string | null }).styleTemplateId !== undefined ||
    (state as { archetypeId?: string | null }).archetypeId !== undefined ||
    (state as { narrativeArchetype?: string | null }).narrativeArchetype !== undefined ||
    (state as { contentAngleId?: string | null }).contentAngleId !== undefined ||
    state.series !== undefined ||
    state.repurposedAssets !== undefined ||
    (state as CinematicProjectPatch).sceneBlueprints !== undefined ||
    (state as CinematicProjectPatch).outputAlignmentControls !== undefined ||
    (state as CinematicProjectPatch).reelTimeline !== undefined
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
      directorMode: (state as { directorMode?: string }).directorMode,
      blueprintId:
        (state as { blueprintId?: string | null }).blueprintId ?? undefined,
      styleTemplateId:
        (state as { styleTemplateId?: string | null }).styleTemplateId ?? undefined,
      archetypeId: (state as { archetypeId?: string | null }).archetypeId ?? undefined,
      archetypeLabel:
        (state as { archetypeLabel?: string | null }).archetypeLabel ?? undefined,
      archetypeDisplay:
        (state as { archetypeDisplay?: string | null }).archetypeDisplay ?? undefined,
      narrativeArchetype:
        (state as { narrativeArchetype?: string | null }).narrativeArchetype ??
        (state as { archetypeId?: string | null }).archetypeId ??
        undefined,
      narrativeArchetypeLabel:
        (state as { narrativeArchetypeLabel?: string | null }).narrativeArchetypeLabel ??
        (state as { archetypeLabel?: string | null }).archetypeLabel ??
        undefined,
      narrativeStructureLabels:
        (state as { narrativeStructureLabels?: string[] | null }).narrativeStructureLabels ??
        undefined,
      narrativeFlowDisplay:
        (state as { narrativeFlowDisplay?: string | null }).narrativeFlowDisplay ?? undefined,
      contentAngleId:
        (state as { contentAngleId?: string | null }).contentAngleId ?? undefined,
      contentAngleLabel:
        (state as { contentAngleLabel?: string | null }).contentAngleLabel ?? undefined,
      hookFramework:
        (state as { hookFramework?: string | null }).hookFramework ?? undefined,
      hookFrameworkLabel:
        (state as { hookFrameworkLabel?: string | null }).hookFrameworkLabel ?? undefined,
      series: state.series ?? undefined,
      repurposedAssets: state.repurposedAssets,
      sceneBlueprints: (state as CinematicProjectPatch).sceneBlueprints,
      outputAlignmentControls: (state as CinematicProjectPatch).outputAlignmentControls,
      reelTimeline: (state as CinematicProjectPatch).reelTimeline ?? undefined,
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
  if ((state as { story_bible?: unknown }).story_bible !== undefined) {
    patch.story_bible = (state as { story_bible?: unknown }).story_bible
  }
  if ((state as { styleTemplateId?: string | null }).styleTemplateId !== undefined) {
    patch.style_template_id = (state as { styleTemplateId?: string | null }).styleTemplateId
  }
  if ((state as { scene_motion?: unknown }).scene_motion !== undefined) {
    patch.scene_motion = (state as { scene_motion?: unknown }).scene_motion
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
  if ((state as { share_as_showcase?: boolean }).share_as_showcase !== undefined) {
    patch.share_as_showcase = Boolean(
      (state as { share_as_showcase?: boolean }).share_as_showcase
    )
  }
  if ((state as CinematicProjectPatch).timeline_state !== undefined) {
    patch.timeline_state = (state as CinematicProjectPatch).timeline_state
  } else if ((state as CinematicProjectPatch).reelTimeline !== undefined) {
    patch.timeline_state = timelineStateFromReelTimeline(
      (state as CinematicProjectPatch).reelTimeline ?? null
    )
  }
  if ((state as CinematicProjectPatch).timeline_json !== undefined) {
    patch.timeline_json = (state as CinematicProjectPatch).timeline_json
  }

  return await mutateCinematicProjectRow('update', patch, id)
}

export async function loadProject(id: string): Promise<CinematicProjectRow> {
  const cached = readProjectHydrationCache(id)
  if (cached) return cached

  const supabase = requireBrowserClient()
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throwIfUnavailable(error)
  const row = data as CinematicProjectRow
  writeProjectHydrationCache(id, row)
  return row
}

/** Permanently remove a project from the library (owner-only via RLS). */
export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Delete failed (${res.status})`)
  }
}

/** Clone a project row into a new draft (no video/reel output copied). */
export async function duplicateProject(id: string): Promise<CinematicProjectRow> {
  const source = await loadProject(id)
  const captions = source.captions
  const hook =
    typeof captions === 'object' && captions && 'hook' in captions
      ? String((captions as { hook?: string }).hook ?? '')
      : ''
  const summary =
    typeof captions === 'object' && captions && 'summary' in captions
      ? String((captions as { summary?: string }).summary ?? '')
      : ''

  return createProject({
    title: `${source.title} (copy)`.slice(0, 120),
    prompt: source.prompt,
    style: source.style,
    duration: source.duration,
    hook,
    summary,
    script: source.script,
    scenes: source.scenes ?? [],
    voice: source.voice,
    captions: typeof captions === 'string' ? captions : '',
    status: 'create',
    mode: source.mode === 'director' ? 'director' : 'quick',
    language: source.language ?? undefined,
    input_type: source.input_type ?? undefined,
    original_transcript: source.original_transcript ?? undefined,
    variation_history: source.variation_history ?? undefined,
    visual_style: source.visual_style ?? undefined,
    storyboard: source.storyboard ?? undefined,
    virlo: source.virlo ?? undefined,
    viral_script: source.viral_script ?? undefined,
  })
}

/** Columns required for {@link rowToSummary} — avoids loading full script JSON on list rails. */
const RECENT_PROJECT_LIST_COLUMNS =
  'id,title,prompt,style,duration,script,scenes,storyboard,voice,captions,status,mode,video_url,thumbnail_url,updated_at,created_at'

export type RecentProjectsLoadResult = {
  projects: CinematicProjectSummary[]
  /** True when the cinematic_projects table has not been created. */
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
  let query = supabase.from('cinematic_projects').select(RECENT_PROJECT_LIST_COLUMNS)

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
      const info = classifyCinematicProjectsError(error)
      console.warn(
        '[cinematic-projects]',
        info?.kind ?? 'unknown',
        '— apply supabase/RUN_IN_SQL_EDITOR.sql'
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

/** Load full project rows for client-side creator knowledge aggregation. */
export async function loadRecentProjectRows(
  limit = 50
): Promise<{ rows: CinematicProjectRow[]; tableUnavailable: boolean }> {
  const supabase = requireBrowserClient()
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (isCinematicProjectsUnavailable(error)) {
      return { rows: [], tableUnavailable: true }
    }
    throw error
  }
  return { rows: (data as CinematicProjectRow[]) ?? [], tableUnavailable: false }
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
    directorMode?: import('@/lib/cinematic/director-modes').DirectorMode
    blueprintId?: string | null
    styleTemplateId?: string | null
    archetypeId?: string | null
    archetypeLabel?: string | null
    archetypeDisplay?: string | null
    narrativeArchetype?: string | null
    narrativeArchetypeLabel?: string | null
    narrativeStructureLabels?: string[] | null
    narrativeFlowDisplay?: string | null
    video_url?: string | null
    thumbnail_url?: string | null
    storyboard?: unknown
    virlo?: unknown
    language?: string
    input_type?: string
    original_transcript?: string
    variation_history?: unknown
    visual_style?: unknown
    story_bible?: import('@/lib/cinematic/story-bible').StoryBible | null
    scene_motion?: import('@/lib/motion/motion-presets').SceneMotionMap | null
    viral_script?: unknown
    generation_status?: string | null
    generation_step?: string | null
    generation_error?: string | null
    last_completed_step?: string | null
    repurposedAssets?: RepurposedAssetsMap
    series?: import('@/lib/cinematic/content-series').ContentSeries | null
    sceneBlueprints?: import('@/lib/cinematic/scene-blueprint').SceneBlueprint[]
    outputAlignmentControls?: import('@/lib/cinematic/scene-blueprint').OutputAlignmentControls
    timeline_state?: Record<string, unknown> | null
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
    directorMode: input.directorMode,
    blueprintId: input.blueprintId,
    styleTemplateId: input.styleTemplateId ?? undefined,
    archetypeId: input.archetypeId ?? undefined,
    archetypeLabel: input.archetypeLabel ?? undefined,
    archetypeDisplay: input.archetypeDisplay ?? undefined,
    narrativeArchetype: input.narrativeArchetype ?? input.archetypeId ?? undefined,
    narrativeArchetypeLabel: input.narrativeArchetypeLabel ?? input.archetypeLabel ?? undefined,
    narrativeStructureLabels: input.narrativeStructureLabels ?? undefined,
    narrativeFlowDisplay: input.narrativeFlowDisplay ?? undefined,
    video_url: input.video_url ?? null,
    thumbnail_url: thumbnail,
    storyboard: input.storyboard ?? scenes,
    virlo: input.virlo ?? null,
    language: input.language,
    input_type: input.input_type,
    original_transcript: input.original_transcript,
    variation_history: input.variation_history ?? null,
    visual_style: input.visual_style ?? null,
    story_bible: input.story_bible ?? null,
    scene_motion: input.scene_motion ?? undefined,
    viral_script: input.viral_script ?? null,
    generation_status: input.generation_status ?? null,
    generation_step: input.generation_step ?? null,
    generation_error: input.generation_error ?? null,
    last_completed_step: input.last_completed_step ?? null,
    repurposedAssets: input.repurposedAssets,
    series: input.series ?? undefined,
    sceneBlueprints: input.scene_blueprints,
    outputAlignmentControls: input.output_alignment_controls,
    timeline_state: input.timeline_state ?? undefined,
  }

  if (input.projectId) {
    return await updateProject(
      input.projectId,
      archivePatch as CinematicProjectPatch
    )
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
      directorMode: input.directorMode,
      blueprintId: input.blueprintId,
      styleTemplateId: input.styleTemplateId ?? undefined,
      archetypeId: input.archetypeId ?? undefined,
      archetypeLabel: input.archetypeLabel ?? undefined,
      archetypeDisplay: input.archetypeDisplay ?? undefined,
      narrativeArchetype: input.narrativeArchetype ?? input.archetypeId ?? undefined,
      narrativeArchetypeLabel: input.narrativeArchetypeLabel ?? input.archetypeLabel ?? undefined,
      narrativeStructureLabels: input.narrativeStructureLabels ?? undefined,
      narrativeFlowDisplay: input.narrativeFlowDisplay ?? undefined,
      video_url: input.video_url ?? null,
      thumbnail_url: thumbnail,
      storyboard: input.storyboard ?? scenes,
      virlo: input.virlo ?? null,
      language: input.language,
      input_type: input.input_type,
      original_transcript: input.original_transcript,
      variation_history: input.variation_history ?? null,
      visual_style: input.visual_style ?? null,
      story_bible: input.story_bible ?? null,
      scene_motion: input.scene_motion ?? undefined,
      viral_script: input.viral_script ?? null,
      generation_status: input.generation_status ?? null,
      generation_step: input.generation_step ?? null,
      generation_error: input.generation_error ?? null,
    last_completed_step: input.last_completed_step ?? null,
    series: input.series ?? undefined,
    repurposedAssets: input.repurposedAssets,
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
