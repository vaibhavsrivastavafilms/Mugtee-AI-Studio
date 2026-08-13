import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import { openProjectHref } from '@/lib/create/routes'
import { buildTimeline } from '@/lib/v7/db.server'
import {
  computeV7ProductionProgress,
  formatV7PausedFailureReason,
} from '@/lib/v7/production-progress'
import type {
  UnifiedLibraryPipelineFilter,
  UnifiedLibraryResponse,
  UnifiedLibrarySort,
  UnifiedLibrarySourceHealth,
  UnifiedLibraryStats,
  UnifiedLibraryStatusFilter,
  UnifiedProjectActions,
  UnifiedProjectItem,
  UnifiedProjectPipeline,
  UnifiedProjectStatus,
} from '@/lib/projects/unified-library.types'
import type { LibraryTimingRecorder } from '@/lib/perf/library-timing.server'
import type { V7ProductionRow, V7ProductionSnapshot, V7SceneRow, V7StageRow } from '@/types/v7/production'
import type { V3ProjectRow } from '@/types/v3/production'

const DEFAULT_PAGE_SIZE = 20
const MAX_PER_SOURCE = 300
const V7_LIBRARY_FETCH_CAP = 100

const V7_LIBRARY_PRODUCTION_COLUMNS =
  'id,user_id,title,prompt,status,creative_brief,current_stage,reel_url,mov_url,thumbnail_url,creator_pack_url,created_at,updated_at'

const V7_LIBRARY_STAGE_COLUMNS = 'production_id,stage,status,error'

const V7_LIBRARY_SCENE_COLUMNS = 'id,production_id,number,storyboard'

type CinematicListRow = {
  id: string
  title: string
  prompt: string | null
  status: string | null
  mode: string | null
  video_url: string | null
  reel_url: string | null
  thumbnail_url: string | null
  generation_status: string | null
  generation_error: string | null
  updated_at: string
  created_at: string
  storyboard: unknown
  scenes: unknown
}

function statusLabel(status: UnifiedProjectStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'running':
      return 'Running'
    case 'paused':
      return 'Paused'
    case 'failed':
      return 'Failed'
    case 'draft':
      return 'Draft'
  }
}

function pipelineLabel(type: UnifiedProjectPipeline): string {
  switch (type) {
    case 'v7':
      return 'V7 Studio'
    case 'quick_cut':
      return 'Quick Cut'
    case 'cinematic':
      return 'Cinematic'
    case 'v3':
      return 'V3 Legacy'
  }
}

function pickThumbnailFromStoryboard(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const board = raw as { imageUrl?: string; thumbnailUrl?: string }
  return board.imageUrl?.trim() || board.thumbnailUrl?.trim() || null
}

function pickThumbnailFromScenes(scenes: unknown): string | null {
  if (!Array.isArray(scenes)) return null
  for (const scene of scenes) {
    if (!scene || typeof scene !== 'object') continue
    const row = scene as { imageUrl?: string; thumbnailUrl?: string; storyboardImages?: Array<{ url?: string }> }
    if (row.imageUrl?.trim()) return row.imageUrl.trim()
    const fromBoard = row.storyboardImages?.find((img) => img.url?.trim())?.url
    if (fromBoard?.trim()) return fromBoard.trim()
  }
  return null
}

function mapV7UnifiedStatus(
  production: V7ProductionRow,
  hasFailedStage: boolean
): UnifiedProjectStatus {
  if (production.status === 'completed' && production.reel_url?.trim()) return 'completed'
  if (production.status === 'completed') return 'completed'
  if (hasFailedStage || production.status === 'failed') return 'paused'
  if (production.status === 'producing' || production.status === 'planning') return 'running'
  return 'draft'
}

function mapCinematicUnifiedStatus(row: CinematicListRow): UnifiedProjectStatus {
  const status = (row.status ?? '').toLowerCase()
  const reel = row.reel_url?.trim() || row.video_url?.trim()
  if (reel && (status === 'complete' || status === 'completed' || status === 'compile')) {
    return 'completed'
  }
  if (status === 'failed' || status === 'error' || row.generation_status === 'failed') {
    return 'failed'
  }
  if (status === 'generating' || status === 'compile' || status === 'preview') return 'running'
  if (status === 'create' || !status) return 'draft'
  return 'running'
}

function mapV3UnifiedStatus(row: V3ProjectRow): UnifiedProjectStatus {
  if (row.status === 'completed' && row.reel_url?.trim()) return 'completed'
  if (row.status === 'completed') return 'completed'
  if (row.status === 'failed') return 'paused'
  if (row.status === 'producing' || row.status === 'planning') return 'running'
  return 'draft'
}

function buildActions(params: {
  status: UnifiedProjectStatus
  reelUrl: string | null
  movUrl: string | null
  creatorPackUrl: string | null
  retryAvailable: boolean
}): UnifiedProjectActions {
  const hasReel = Boolean(params.reelUrl?.trim())
  return {
    open: true,
    continue: params.status === 'running' || params.status === 'paused' || params.status === 'draft',
    retry: params.retryAvailable && params.status === 'paused',
    watch: hasReel,
    download: hasReel,
    downloadMov: Boolean(params.movUrl?.trim()),
    creatorPack: Boolean(params.creatorPackUrl?.trim()),
  }
}

function buildV7Items(params: {
  productions: V7ProductionRow[]
  stagesByProduction: Map<string, V7StageRow[]>
  scenesByProduction: Map<string, V7SceneRow[]>
}): UnifiedProjectItem[] {
  return params.productions.map((production) => {
    const stages = params.stagesByProduction.get(production.id) ?? []
    const scenes = params.scenesByProduction.get(production.id) ?? []
    const timeline = buildTimeline(stages)
    const snapshot: V7ProductionSnapshot = {
      production,
      stages,
      scenes,
      timeline,
    }
    const progress = computeV7ProductionProgress(snapshot)
    const failedStage = stages.find((row) => row.status === 'failed')
    const status = mapV7UnifiedStatus(production, Boolean(failedStage))
    const pausedCopy = formatV7PausedFailureReason(progress.paused?.reason ?? failedStage?.error ?? null)

    const sceneThumb = scenes
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((scene) => pickThumbnailFromStoryboard(scene.storyboard))
      .find(Boolean)

    const reelUrl = production.reel_url?.trim() || null
    const movUrl = production.mov_url?.trim() || null
    const creatorPackUrl = production.creator_pack_url?.trim() || null
    const sceneProgressLabel = progress.sceneProgress
      ? `Scene ${progress.sceneProgress.currentSceneNumber ?? progress.sceneProgress.completedScenes + 1} / ${progress.sceneProgress.totalScenes}`
      : null
    const briefDuration = production.creative_brief?.duration
    const durationLabel =
      status === 'completed' && typeof briefDuration === 'number' && briefDuration > 0
        ? `${briefDuration} sec`
        : null

    return {
      id: production.id,
      title: production.title?.trim() || 'Untitled production',
      prompt: production.prompt?.trim() || '',
      type: 'v7',
      typeLabel: pipelineLabel('v7'),
      status,
      statusLabel: status === 'paused' ? 'Production paused' : statusLabel(status),
      currentStage: progress.currentStageLabel,
      currentTask: progress.currentTask,
      progress: progress.overallPercent,
      pausedReason: pausedCopy.summary ?? progress.paused?.reason ?? null,
      pausedDetail: pausedCopy.detail,
      retryAvailable: Boolean(progress.paused?.retryAvailable),
      thumbnailUrl: production.thumbnail_url?.trim() || sceneThumb || null,
      reelUrl,
      movUrl,
      creatorPackUrl,
      createdAt: production.created_at,
      updatedAt: production.updated_at,
      completedAt: status === 'completed' ? production.updated_at : null,
      route: `/studio/${production.id}`,
      sceneProgressLabel,
      durationLabel,
      actions: buildActions({
        status,
        reelUrl,
        movUrl,
        creatorPackUrl,
        retryAvailable: Boolean(progress.paused?.retryAvailable),
      }),
    }
  })
}

function buildCinematicItems(rows: CinematicListRow[], type: 'quick_cut' | 'cinematic'): UnifiedProjectItem[] {
  return rows.map((row) => {
    const status = mapCinematicUnifiedStatus(row)
    const reelUrl = row.reel_url?.trim() || row.video_url?.trim() || null
    const mode = type === 'quick_cut' ? 'quick' : 'director'
    const thumbnail =
      row.thumbnail_url?.trim() ||
      pickThumbnailFromScenes(row.scenes) ||
      pickThumbnailFromStoryboard(row.storyboard) ||
      null

    const progress =
      status === 'completed' ? 100 : status === 'draft' ? 5 : status === 'failed' ? 0 : 45

    return {
      id: row.id,
      title: row.title?.trim() || 'Untitled project',
      prompt: row.prompt?.trim() || '',
      type,
      typeLabel: pipelineLabel(type),
      status,
      statusLabel: statusLabel(status),
      currentStage: row.generation_status ?? row.status ?? null,
      currentTask:
        status === 'failed'
          ? row.generation_error ?? 'Generation failed'
          : status === 'completed'
            ? 'Ready to share'
            : 'In progress',
      progress,
      pausedReason: status === 'failed' ? row.generation_error ?? null : null,
      pausedDetail: null,
      retryAvailable: false,
      thumbnailUrl: thumbnail,
      reelUrl,
      movUrl: null,
      creatorPackUrl: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: status === 'completed' ? row.updated_at : null,
      route: openProjectHref(row.status ?? 'create', row.id, mode, {
        videoUrl: reelUrl,
        hasPlayablePreview: Boolean(reelUrl),
      }),
      actions: buildActions({
        status,
        reelUrl,
        movUrl: null,
        creatorPackUrl: null,
        retryAvailable: false,
      }),
    }
  })
}

function buildV3Items(rows: V3ProjectRow[]): UnifiedProjectItem[] {
  return rows.map((row) => {
    const status = mapV3UnifiedStatus(row)
    const reelUrl = row.reel_url?.trim() || null
    const progress =
      status === 'completed' ? 100 : status === 'draft' ? 5 : status === 'paused' ? 35 : 55

    return {
      id: row.id,
      title: row.title?.trim() || 'Untitled production',
      prompt: row.prompt?.trim() || '',
      type: 'v3',
      typeLabel: pipelineLabel('v3'),
      status,
      statusLabel: statusLabel(status),
      currentStage: row.current_stage,
      currentTask:
        status === 'completed'
          ? 'Production complete'
          : status === 'paused'
            ? 'Production paused'
            : 'In progress',
      progress,
      pausedReason: status === 'paused' ? 'Stage failed — open to retry' : null,
      pausedDetail: null,
      retryAvailable: status === 'paused',
      thumbnailUrl: null,
      reelUrl,
      movUrl: null,
      creatorPackUrl: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: status === 'completed' ? row.updated_at : null,
      route: `/v3/${row.id}`,
      actions: buildActions({
        status,
        reelUrl,
        movUrl: null,
        creatorPackUrl: null,
        retryAvailable: status === 'paused',
      }),
    }
  })
}

function matchesSearch(item: UnifiedProjectItem, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [item.title, item.prompt, item.id].join(' ').toLowerCase().includes(q)
}

function matchesStatusFilter(item: UnifiedProjectItem, filter: UnifiedLibraryStatusFilter): boolean {
  if (filter === 'all') return true
  return item.status === filter
}

function matchesPipelineFilter(
  item: UnifiedProjectItem,
  filter: UnifiedLibraryPipelineFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'v7') return item.type === 'v7'
  if (filter === 'quick_cut') return item.type === 'quick_cut'
  if (filter === 'cinematic') return item.type === 'cinematic'
  if (filter === 'v3') return item.type === 'v3'
  return true
}

function sortProjects(items: UnifiedProjectItem[], sort: UnifiedLibrarySort): UnifiedProjectItem[] {
  const copy = [...items]
  switch (sort) {
    case 'newest':
      copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      break
    case 'oldest':
      copy.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      break
    case 'recently_completed':
      copy.sort((a, b) => {
        const aTime = a.completedAt ? Date.parse(a.completedAt) : 0
        const bTime = b.completedAt ? Date.parse(b.completedAt) : 0
        if (aTime !== bTime) return bTime - aTime
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      })
      break
    case 'recently_updated':
    default:
      copy.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      break
  }
  return copy
}

function resolveV7FetchLimit(params: {
  page: number
  pageSize: number
  pipelineFilter: UnifiedLibraryPipelineFilter
  statusFilter: UnifiedLibraryStatusFilter
  search: string
  sort: UnifiedLibrarySort
}): { limit: number; orderColumn: 'created_at' | 'updated_at' } {
  const orderColumn = params.sort === 'newest' ? 'created_at' : 'updated_at'
  const v7Only =
    params.pipelineFilter === 'v7' && !params.search.trim() && params.statusFilter === 'all'

  if (v7Only) {
    return {
      limit: Math.min(Math.max(params.page * params.pageSize, params.pageSize), 50),
      orderColumn,
    }
  }

  if (params.pipelineFilter === 'v7') {
    return {
      limit: Math.min(params.page * params.pageSize * 4, V7_LIBRARY_FETCH_CAP),
      orderColumn,
    }
  }

  return { limit: MAX_PER_SOURCE, orderColumn: 'updated_at' }
}

async function fetchV7LibraryItems(params: {
  supabase: SupabaseServerClient
  productions: V7ProductionRow[]
}): Promise<UnifiedProjectItem[]> {
  if (params.productions.length === 0) return []

  const ids = params.productions.map((row) => row.id)
  const idsNeedingSceneThumb = params.productions
    .filter((row) => !row.thumbnail_url?.trim())
    .map((row) => row.id)

  const stageQuery = params.supabase
    .from('v7_stages')
    .select(V7_LIBRARY_STAGE_COLUMNS)
    .in('production_id', ids)

  const sceneQuery =
    idsNeedingSceneThumb.length > 0
      ? params.supabase
          .from('v7_scenes')
          .select(V7_LIBRARY_SCENE_COLUMNS)
          .in('production_id', idsNeedingSceneThumb)
          .order('number')
      : null

  const [{ data: stageRows }, sceneResult] = await Promise.all([
    stageQuery,
    sceneQuery ?? Promise.resolve({ data: [] as V7SceneRow[] }),
  ])

  const stagesByProduction = new Map<string, V7StageRow[]>()
  for (const row of (stageRows ?? []) as V7StageRow[]) {
    const list = stagesByProduction.get(row.production_id) ?? []
    list.push(row)
    stagesByProduction.set(row.production_id, list)
  }

  const scenesByProduction = new Map<string, V7SceneRow[]>()
  for (const row of (sceneResult.data ?? []) as V7SceneRow[]) {
    const list = scenesByProduction.get(row.production_id) ?? []
    list.push(row)
    scenesByProduction.set(row.production_id, list)
  }

  return buildV7Items({ productions: params.productions, stagesByProduction, scenesByProduction })
}

function computeStats(items: UnifiedProjectItem[]): UnifiedLibraryStats {
  return {
    total: items.length,
    v7: items.filter((row) => row.type === 'v7').length,
    quickCut: items.filter((row) => row.type === 'quick_cut').length,
    cinematic: items.filter((row) => row.type === 'cinematic').length,
    v3: items.filter((row) => row.type === 'v3').length,
    completed: items.filter((row) => row.status === 'completed').length,
    running: items.filter((row) => row.status === 'running').length,
    paused: items.filter((row) => row.status === 'paused').length,
    failed: items.filter((row) => row.status === 'failed').length,
    draft: items.filter((row) => row.status === 'draft').length,
  }
}

export async function fetchUnifiedProjectLibrary(params: {
  supabase: SupabaseServerClient
  userId: string
  page?: number
  pageSize?: number
  status?: UnifiedLibraryStatusFilter
  pipeline?: UnifiedLibraryPipelineFilter
  search?: string
  sort?: UnifiedLibrarySort
  timing?: LibraryTimingRecorder
}): Promise<UnifiedLibraryResponse> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const statusFilter = params.status ?? 'all'
  const pipelineFilter = params.pipeline ?? 'all'
  const search = params.search ?? ''
  const sort = params.sort ?? 'recently_updated'
  const v7Only = pipelineFilter === 'v7'

  const sources: UnifiedLibrarySourceHealth = { v7: 'ok', cinematic: 'ok', v3: 'ok', errors: [] }
  const merged: UnifiedProjectItem[] = []
  let v7Ids = new Set<string>()
  const { limit: v7Limit, orderColumn: v7OrderColumn } = resolveV7FetchLimit({
    page,
    pageSize,
    pipelineFilter,
    statusFilter,
    search,
    sort,
  })

  try {
    const v7QueryStarted = performance.now()
    const { data: v7Rows, error } = await params.supabase
      .from('v7_productions')
      .select(V7_LIBRARY_PRODUCTION_COLUMNS)
      .eq('user_id', params.userId)
      .order(v7OrderColumn, { ascending: false })
      .limit(v7Limit)

    if (error) throw error
    params.timing?.mark('v7Query')

    const productions = (v7Rows ?? []) as V7ProductionRow[]
    v7Ids = new Set(productions.map((row) => row.id))

    if (productions.length > 0) {
      merged.push(
        ...(await fetchV7LibraryItems({
          supabase: params.supabase,
          productions,
        }))
      )
      params.timing?.mark('assets')
    }

    if (process.env.NODE_ENV !== 'production') {
      const v7Ms = Math.round(performance.now() - v7QueryStarted)
      if (v7Ms > 500) {
        console.info(`[library-timing] v7-source-detail: ${v7Ms}ms limit=${v7Limit}`)
      }
    }
  } catch (err) {
    sources.v7 = 'error'
    sources.errors.push(err instanceof Error ? err.message : 'V7 source unavailable')
    console.error('[unified-library] v7 source failed', err)
    params.timing?.mark('v7Query')
  }

  if (!v7Only) {
    try {
      const cinematicStarted = performance.now()
      const { data, error } = await params.supabase
        .from('cinematic_projects')
        .select(
          'id,title,prompt,status,mode,video_url,reel_url,thumbnail_url,generation_status,generation_error,updated_at,created_at,storyboard,scenes'
        )
        .eq('user_id', params.userId)
        .order('updated_at', { ascending: false })
        .limit(MAX_PER_SOURCE)

      if (error) throw error

      const cinematicRows = ((data ?? []) as CinematicListRow[]).filter((row) => !v7Ids.has(row.id))
      const quickCut = cinematicRows.filter((row) => row.mode === 'quick')
      const cinematic = cinematicRows.filter((row) => row.mode !== 'quick')

      merged.push(...buildCinematicItems(quickCut, 'quick_cut'))
      merged.push(...buildCinematicItems(cinematic, 'cinematic'))
      params.timing?.mark('cinematicQuery')
      if (process.env.NODE_ENV !== 'production') {
        const cinematicMs = Math.round(performance.now() - cinematicStarted)
        if (cinematicMs > 500) {
          console.info(`[library-timing] cinematic-query-detail: ${cinematicMs}ms`)
        }
      }
    } catch (err) {
      sources.cinematic = 'error'
      sources.errors.push(err instanceof Error ? err.message : 'Cinematic source unavailable')
      console.error('[unified-library] cinematic source failed', err)
      params.timing?.mark('cinematicQuery')
    }

    try {
      const v3Started = performance.now()
      const { data, error } = await params.supabase
        .from('v3_projects')
        .select('*')
        .eq('user_id', params.userId)
        .order('updated_at', { ascending: false })
        .limit(MAX_PER_SOURCE)

      if (error) throw error

      const v3Rows = ((data ?? []) as V3ProjectRow[]).filter(
        (row) => !v7Ids.has(row.id) && !merged.some((item) => item.id === row.id)
      )
      merged.push(...buildV3Items(v3Rows))
      params.timing?.mark('v3Query')
      if (process.env.NODE_ENV !== 'production') {
        const v3Ms = Math.round(performance.now() - v3Started)
        if (v3Ms > 500) {
          console.info(`[library-timing] v3-query-detail: ${v3Ms}ms`)
        }
      }
    } catch (err) {
      sources.v3 = 'error'
      sources.errors.push(err instanceof Error ? err.message : 'V3 source unavailable')
      console.error('[unified-library] v3 source failed', err)
      params.timing?.mark('v3Query')
    }
  } else {
    // cinematic + v3 intentionally skipped for pipeline=v7
  }

  const stats = computeStats(merged)

  let filtered = merged.filter(
    (item) => matchesSearch(item, search) && matchesStatusFilter(item, statusFilter)
  )
  filtered = filtered.filter((item) => matchesPipelineFilter(item, pipelineFilter))
  filtered = sortProjects(filtered, sort)

  const total = filtered.length
  const start = (page - 1) * pageSize
  const projects = filtered.slice(start, start + pageSize)

  params.timing?.mark('mapping')

  return {
    ok: true,
    projects,
    page,
    pageSize,
    total,
    hasMore: start + pageSize < total,
    stats,
    sources,
  }
}
