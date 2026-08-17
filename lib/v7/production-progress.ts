import { V7_STAGE_LABELS, type V7CreativeBrief, type V7ProductionSnapshot, type V7StageId, type V7StageRow, type V7TimelineStage, type V7TimelineStageStatus } from '@/types/v7/production'
import { detectProductionStateDrift } from '@/lib/v7/pipeline-state.core'
import { v7HasDeliverableMedia } from '@/lib/v7/deliverable-media.core'

/** Raw stage weights from V14 spec (normalized to 100% at runtime). */
const V7_STAGE_WEIGHTS_RAW: Record<V7StageId, number> = {
  idea: 2,
  research: 4,
  creative: 5,
  script: 8,
  character: 5,
  world: 5,
  storyboard: 8,
  image: 20,
  animation: 25,
  voice: 5,
  music: 4,
  sound: 3,
  edit: 3,
  quality: 0,
  render: 6,
  export: 2,
}

const WEIGHT_TOTAL = Object.values(V7_STAGE_WEIGHTS_RAW).reduce((sum, value) => sum + value, 0)

export const V7_STAGE_WEIGHTS: Record<V7StageId, number> = Object.fromEntries(
  Object.entries(V7_STAGE_WEIGHTS_RAW).map(([stage, weight]) => [
    stage,
    (weight / WEIGHT_TOTAL) * 100,
  ])
) as Record<V7StageId, number>

const SCENE_STAGE_IDS = new Set<V7StageId>(['image', 'animation'])

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  pollinations: 'Pollinations',
  openrouter: 'OpenRouter',
  wan: 'WAN Video',
  'openart-mcp': 'OpenArt',
  openart: 'OpenArt',
  seedance: 'Seedance',
  runway: 'Runway',
  cogvideox: 'CogVideoX',
  hunyuan: 'HunyuanVideo',
  mochi: 'Mochi',
  ltx: 'LTX Video',
  animatediff: 'AnimateDiff',
  'image-animation': 'Image Animation',
  gemini: 'Gemini',
  together: 'Together AI',
  fal: 'FAL',
}

type SceneStoryboard = {
  imageUrl?: string
  videoUrl?: string
  imageCheckpointAt?: string
  videoCheckpointAt?: string
  animationProvider?: string
  imageMetadata?: { provider?: string; model?: string; generationTimeMs?: number }
  videoMetadata?: { provider?: string; model?: string; generationTimeMs?: number }
  videoGenerationStatus?: string
}

export type V7SceneProgress = {
  completedScenes: number
  totalScenes: number
  scenePercent: number
  currentSceneNumber: number | null
}

export type V7ProviderProgress = {
  providerId: string
  displayName: string
  model: string | null
  sceneNumber: number | null
  totalScenes: number
  status: string
}

export type V7ProductionProgressEta = {
  remainingMs: number | null
  completionAt: Date | null
  frozen: boolean
  label: string | null
}

export type V7ProductionCompletionStats = {
  totalGenerationMs: number
  renderMs: number | null
  averageSceneGenerationMs: number | null
}

export type V7StageProgressDisplay = {
  stageId: V7StageId
  label: string
  emoji: string
  status: V7TimelineStageStatus
  /** Numeric percent when known; null when indeterminate. */
  percent: number | null
  indeterminate: boolean
  timingLabel: string | null
  detailLabel: string | null
  error: string | null
}

export type V7ProductionProgress = {
  overallPercent: number
  completedWeight: number
  remainingWeight: number
  currentStageId: V7StageId | null
  currentStageLabel: string | null
  currentTask: string
  sceneProgress: V7SceneProgress | null
  provider: V7ProviderProgress | null
  eta: V7ProductionProgressEta
  completedStageIds: V7StageId[]
  elapsedMs: number
  historicalAverageMs: number | null
  stageProgressList: V7StageProgressDisplay[]
  paused: {
    failedStageId: V7StageId | null
    failedStageLabel: string | null
    reason: string | null
    retryAvailable: boolean
  } | null
  completionStats: V7ProductionCompletionStats | null
}

export function findV7FailedTimelineStage(
  snapshot: V7ProductionSnapshot
): V7TimelineStage | undefined {
  return snapshot.timeline.find((stage) => stage.status === 'failed')
}

export function resolveV7RetryStageId(snapshot: V7ProductionSnapshot): V7StageId | null {
  const failedTimeline = findV7FailedTimelineStage(snapshot)
  if (failedTimeline) return failedTimeline.id

  const failedRow = snapshot.stages.find((row) => row.status === 'failed')
  if (failedRow) return failedRow.stage as V7StageId

  const drift = detectProductionStateDrift(snapshot)
  if (drift.recoverable && drift.resumeStage) return drift.resumeStage

  return null
}

export function canRetryV7Production(snapshot: V7ProductionSnapshot): boolean {
  if (findV7FailedTimelineStage(snapshot)) return true
  if (snapshot.stages.some((row) => row.status === 'failed')) return true
  if (snapshot.production.status === 'failed') return true
  return detectProductionStateDrift(snapshot).recoverable
}

export type V7PausedFailureCopy = {
  summary: string | null
  detail: string | null
  technical: string | null
}

export function formatV7PausedFailureReason(reason: string | null): V7PausedFailureCopy {
  if (!reason?.trim()) {
    return { summary: null, detail: null, technical: null }
  }

  const trimmed = reason.trim()
  const validationMatch = trimmed.match(
    /IMAGE_PROMPT_VALIDATION_FAILED scene (\d+)(?:: score (\d+)\/100)?/i
  )

  if (validationMatch) {
    const sceneNumber = validationMatch[1]
    const score = validationMatch[2]
    return {
      summary: `Scene ${sceneNumber} failed image validation.`,
      detail: score ? `Score: ${score}/100` : null,
      technical: trimmed,
    }
  }

  return { summary: null, detail: null, technical: trimmed }
}

function parseStoryboard(raw: Record<string, unknown>): SceneStoryboard {
  return raw as SceneStoryboard
}

function resolveTotalScenes(snapshot: V7ProductionSnapshot): number {
  if (snapshot.scenes.length > 0) return snapshot.scenes.length
  const briefCount = snapshot.production.creative_brief?.sceneCount
  if (typeof briefCount === 'number' && briefCount > 0) return briefCount
  return 0
}

function countSceneCheckpoints(
  snapshot: V7ProductionSnapshot,
  kind: 'image' | 'video'
): number {
  const field = kind === 'image' ? 'imageCheckpointAt' : 'videoCheckpointAt'
  return snapshot.scenes.filter((scene) => {
    const board = parseStoryboard(scene.storyboard ?? {})
    return Boolean(board[field])
  }).length
}

export function resolveV7SceneProgress(
  snapshot: V7ProductionSnapshot,
  stageId: V7StageId
): V7SceneProgress | null {
  if (!SCENE_STAGE_IDS.has(stageId)) return null

  const totalScenes = resolveTotalScenes(snapshot)
  if (totalScenes <= 0) return null

  const checkpointKind = stageId === 'image' ? 'image' : 'video'
  const completedScenes = countSceneCheckpoints(snapshot, checkpointKind)
  const scenePercent =
    totalScenes > 0 ? Math.min(100, Math.round((completedScenes / totalScenes) * 100)) : 0

  const currentSceneNumber =
    completedScenes < totalScenes ? completedScenes + 1 : completedScenes > 0 ? completedScenes : 1

  return {
    completedScenes,
    totalScenes,
    scenePercent,
    currentSceneNumber,
  }
}

function stageRow(snapshot: V7ProductionSnapshot, stageId: V7StageId): V7StageRow | undefined {
  return snapshot.stages.find((row) => row.stage === stageId)
}

function resolveDisplayedCurrentStageId(
  snapshot: V7ProductionSnapshot,
  failedStage: V7TimelineStage | undefined,
  isPaused: boolean
): V7StageId | null {
  if (!isPaused || failedStage) return null
  const drift = detectProductionStateDrift(snapshot)
  return drift.recoverable ? drift.resumeStage : null
}

function resolvePausedStageLabel(
  snapshot: V7ProductionSnapshot,
  failedStage: V7TimelineStage | undefined
): string | null {
  if (failedStage) return failedStage.label
  const drift = detectProductionStateDrift(snapshot)
  if (drift.recoverable && drift.resumeStage) {
    return V7_STAGE_LABELS[drift.resumeStage]?.label ?? null
  }
  return snapshot.production.current_stage
    ? V7_STAGE_LABELS[snapshot.production.current_stage]?.label ?? null
    : null
}

function stageProgressFraction(
  snapshot: V7ProductionSnapshot,
  stageId: V7StageId,
  timelineStage: V7TimelineStage | undefined
): number {
  const status = timelineStage?.status ?? stageRow(snapshot, stageId)?.status

  if (status === 'completed') return 1
  if (status !== 'running' && status !== 'blocked') return 0

  if (SCENE_STAGE_IDS.has(stageId)) {
    const scene = resolveV7SceneProgress(snapshot, stageId)
    if (!scene || scene.totalScenes <= 0) return 0
    return scene.completedScenes / scene.totalScenes
  }

  // Non-scene running stage: no fabricated intra-stage progress.
  return 0
}

function readStageWallClockMs(row: V7StageRow | undefined, now: Date): number | null {
  if (!row?.started_at) return null
  const started = Date.parse(row.started_at)
  if (!Number.isFinite(started)) return null
  const ended = row.completed_at ? Date.parse(row.completed_at) : now.getTime()
  if (!Number.isFinite(ended)) return null
  return Math.max(0, ended - started)
}

function resolveStageTimingLabel(
  row: V7StageRow | undefined,
  status: V7TimelineStageStatus,
  now: Date
): string | null {
  if (status === 'pending') return 'Waiting'
  if (status === 'blocked') return 'Skipped'
  if (status === 'failed') return 'Failed'

  if (status === 'completed') {
    const durationMs = readStageDurationMs(row) ?? readStageWallClockMs(row, now)
    return durationMs != null ? `Completed in ${formatDurationMs(durationMs)}` : null
  }

  if (status === 'running') {
    const elapsedMs = readStageWallClockMs(row, now)
    return elapsedMs != null ? `${formatDurationMs(elapsedMs)} elapsed` : 'Processing…'
  }

  return null
}

function resolveStagePercentAndDetail(
  snapshot: V7ProductionSnapshot,
  stageId: V7StageId,
  status: V7TimelineStageStatus
): Pick<V7StageProgressDisplay, 'percent' | 'indeterminate' | 'detailLabel'> {
  if (status === 'completed') {
    return { percent: 100, indeterminate: false, detailLabel: null }
  }

  if (status === 'pending' || status === 'failed') {
    return { percent: status === 'failed' ? null : 0, indeterminate: false, detailLabel: null }
  }

  if (status === 'blocked') {
    return { percent: null, indeterminate: false, detailLabel: 'Skipped' }
  }

  if (SCENE_STAGE_IDS.has(stageId)) {
    const scene = resolveV7SceneProgress(snapshot, stageId)
    if (scene && scene.totalScenes > 0) {
      return {
        percent: scene.scenePercent,
        indeterminate: false,
        detailLabel: `${scene.completedScenes} / ${scene.totalScenes} scenes`,
      }
    }
  }

  if (status === 'running' || status === 'blocked') {
    return { percent: null, indeterminate: true, detailLabel: 'Processing…' }
  }

  return { percent: 0, indeterminate: false, detailLabel: null }
}

export function buildStageProgressList(
  snapshot: V7ProductionSnapshot,
  now: Date = new Date()
): V7StageProgressDisplay[] {
  return snapshot.timeline.map((timelineStage) => {
    const row = stageRow(snapshot, timelineStage.id)
    const { percent, indeterminate, detailLabel } = resolveStagePercentAndDetail(
      snapshot,
      timelineStage.id,
      timelineStage.status
    )

    return {
      stageId: timelineStage.id,
      label: timelineStage.label,
      emoji: timelineStage.emoji,
      status: timelineStage.status,
      percent,
      indeterminate,
      timingLabel: resolveStageTimingLabel(row, timelineStage.status, now),
      detailLabel,
      error: timelineStage.error ?? row?.error ?? null,
    }
  })
}

export function computeProductionElapsedMs(
  snapshot: V7ProductionSnapshot,
  now: Date = new Date()
): number {
  const created = Date.parse(snapshot.production.created_at)
  if (!Number.isFinite(created)) return 0

  if (snapshot.production.status === 'completed' || v7HasDeliverableMedia(snapshot.production)) {
    const exportStage = stageRow(snapshot, 'export')
    const renderStage = stageRow(snapshot, 'render')
    const completedAt = exportStage?.completed_at ?? renderStage?.completed_at
    if (completedAt) {
      const end = Date.parse(completedAt)
      if (Number.isFinite(end)) return Math.max(0, end - created)
    }
  }

  return Math.max(0, now.getTime() - created)
}

/** Exponential smoothing to avoid ETA jumping every poll. */
export function smoothEtaRemainingMs(previous: number | null, next: number | null): number | null {
  if (next == null) return previous
  if (previous == null) return next
  return Math.round(previous * 0.65 + next * 0.35)
}

export function computeV7ProductionProgress(
  snapshot: V7ProductionSnapshot,
  now: Date = new Date(),
  options?: { historicalAverageMs?: number | null; smoothedRemainingMs?: number | null }
): V7ProductionProgress {
  const brief = snapshot.production.creative_brief
  const timelineById = new Map(snapshot.timeline.map((stage) => [stage.id, stage]))
  const failedStage = snapshot.timeline.find((stage) => stage.status === 'failed')
  const isPaused = snapshot.production.status === 'failed' || Boolean(failedStage)
  const isComplete = snapshot.production.status === 'completed'
  const hasDeliverable = v7HasDeliverableMedia(snapshot.production)

  let completedWeight = 0
  const completedStageIds: V7StageId[] = []

  for (const stageId of Object.keys(V7_STAGE_WEIGHTS) as V7StageId[]) {
    const weight = V7_STAGE_WEIGHTS[stageId] ?? 0
    if (weight <= 0) continue

    const fraction = stageProgressFraction(snapshot, stageId, timelineById.get(stageId))
    completedWeight += weight * fraction

    if (fraction >= 1) completedStageIds.push(stageId)
  }

  const remainingWeight = Math.max(0, 100 - completedWeight)
  let overallPercent = Math.min(100, Math.max(0, Math.round(completedWeight)))

  if (isComplete || hasDeliverable) {
    overallPercent = 100
  }

  const currentStageId =
    resolveDisplayedCurrentStageId(snapshot, failedStage, isPaused) ??
    (snapshot.production.current_stage as V7StageId | null) ??
    snapshot.timeline.find((stage) => stage.status === 'running')?.id ??
    snapshot.timeline.find((stage) => stage.status === 'blocked')?.id ??
    null

  const currentStageLabel = currentStageId ? V7_STAGE_LABELS[currentStageId].label : null
  const sceneProgress = currentStageId ? resolveV7SceneProgress(snapshot, currentStageId) : null
  const pausedStageLabel = isPaused
    ? failedStage
      ? failedStage.label
      : resolvePausedStageLabel(snapshot, failedStage)
    : null

  const currentTask = buildCurrentTask({
    snapshot,
    currentStageId,
    brief,
    sceneProgress,
    isComplete,
    isPaused,
    failedStage,
    pausedStageLabel,
  })

  const provider = resolveActiveProvider(snapshot, currentStageId, sceneProgress)

  const etaRaw = computeEta({
    snapshot,
    now,
    completedWeight: isComplete || hasDeliverable ? 100 : completedWeight,
    remainingWeight: isComplete || hasDeliverable ? 0 : remainingWeight,
    frozen: isPaused,
  })

  const eta =
    options?.smoothedRemainingMs != null && etaRaw.remainingMs != null
      ? {
          ...etaRaw,
          remainingMs: options.smoothedRemainingMs,
          label: formatRemainingLabel(options.smoothedRemainingMs),
          completionAt: new Date(now.getTime() + options.smoothedRemainingMs),
        }
      : etaRaw

  const paused = isPaused
    ? {
        failedStageId: (failedStage?.id ??
          resolveDisplayedCurrentStageId(snapshot, failedStage, isPaused) ??
          snapshot.production.current_stage) as V7StageId | null,
        failedStageLabel: pausedStageLabel,
        reason: failedStage?.error ?? snapshot.block_reason ?? null,
        retryAvailable: canRetryV7Production(snapshot),
      }
    : null

  const completionStats =
    isComplete || hasDeliverable ? buildCompletionStats(snapshot) : null

  const elapsedMs = computeProductionElapsedMs(snapshot, now)
  const stageProgressList = buildStageProgressList(snapshot, now)

  return {
    overallPercent,
    completedWeight: isComplete || hasDeliverable ? 100 : completedWeight,
    remainingWeight: isComplete || hasDeliverable ? 0 : remainingWeight,
    currentStageId,
    currentStageLabel,
    currentTask: isComplete || hasDeliverable ? 'Creation complete' : currentTask,
    sceneProgress:
      currentStageId && SCENE_STAGE_IDS.has(currentStageId) ? sceneProgress : null,
    provider,
    eta,
    completedStageIds,
    elapsedMs,
    historicalAverageMs: options?.historicalAverageMs ?? null,
    stageProgressList,
    paused,
    completionStats,
  }
}

function buildCurrentTask(params: {
  snapshot: V7ProductionSnapshot
  currentStageId: V7StageId | null
  brief: V7CreativeBrief | null
  sceneProgress: V7SceneProgress | null
  isComplete: boolean
  isPaused: boolean
  failedStage: V7TimelineStage | undefined
  pausedStageLabel: string | null
}): string {
  if (params.isComplete) return 'Production complete'
  if (params.isPaused) {
    const stage = params.failedStage?.label ?? params.pausedStageLabel ?? 'Production'
    return `Production paused — ${stage}`
  }

  const stageId = params.currentStageId
  if (!stageId) return 'Preparing production…'

  const brief = params.brief
  const scene = params.sceneProgress

  switch (stageId) {
    case 'idea':
      return 'Understanding your idea…'
    case 'research':
      return brief?.location
        ? `Researching ${brief.location}…`
        : brief?.genre
          ? `Researching ${brief.genre}…`
          : 'Researching your topic…'
    case 'creative':
      return 'Crafting creative direction…'
    case 'script':
      return 'Writing screenplay…'
    case 'character':
      return 'Designing characters…'
    case 'world':
      return 'Building the world…'
    case 'storyboard':
      return 'Generating storyboard…'
    case 'image':
      return scene
        ? `Generating scene ${scene.currentSceneNumber} of ${scene.totalScenes}…`
        : 'Generating images…'
    case 'animation':
      return scene
        ? `Animating scene ${scene.currentSceneNumber} of ${scene.totalScenes}…`
        : 'Animating scenes…'
    case 'voice':
      return 'Recording narration…'
    case 'music':
      return 'Composing soundtrack…'
    case 'sound':
      return 'Designing sound…'
    case 'edit':
      return 'Assembling timeline…'
    case 'quality':
      return 'Running quality check…'
    case 'render':
      return 'Rendering movie…'
    case 'export':
      return 'Preparing creator pack…'
  }
}

function formatProviderName(providerId: string): string {
  return PROVIDER_DISPLAY_NAMES[providerId] ?? providerId.replace(/-/g, ' ')
}

function resolveActiveProvider(
  snapshot: V7ProductionSnapshot,
  currentStageId: V7StageId | null,
  sceneProgress: V7SceneProgress | null
): V7ProviderProgress | null {
  if (!currentStageId || (currentStageId !== 'image' && currentStageId !== 'animation')) {
    return null
  }

  const totalScenes = sceneProgress?.totalScenes ?? resolveTotalScenes(snapshot)
  const sceneNumber = sceneProgress?.currentSceneNumber ?? null

  let providerId: string | null = null
  let model: string | null = null

  const sortedScenes = [...snapshot.scenes].sort((a, b) => a.number - b.number)
  const lastCheckpointScene = [...sortedScenes]
    .reverse()
    .find((scene) => {
      const board = parseStoryboard(scene.storyboard ?? {})
      return currentStageId === 'image'
        ? Boolean(board.imageCheckpointAt)
        : Boolean(board.videoCheckpointAt)
    })

  if (lastCheckpointScene) {
    const board = parseStoryboard(lastCheckpointScene.storyboard ?? {})
    const meta =
      currentStageId === 'image' ? board.imageMetadata : board.videoMetadata
    providerId =
      (typeof meta?.provider === 'string' ? meta.provider : null) ??
      (typeof board.animationProvider === 'string' ? board.animationProvider : null)
    model = typeof meta?.model === 'string' ? meta.model : null
  }

  if (!providerId && currentStageId === 'animation') {
    const animationStage = stageRow(snapshot, 'animation')
    const outputProvider = animationStage?.output?.provider
    if (typeof outputProvider === 'string') providerId = outputProvider

    const timelineProvider = (
      snapshot.production.timeline_json as { animationProvider?: string } | null
    )?.animationProvider
    if (!providerId && typeof timelineProvider === 'string') providerId = timelineProvider
  }

  if (!providerId) return null

  return {
    providerId,
    displayName: formatProviderName(providerId),
    model,
    sceneNumber,
    totalScenes,
    status: 'Generating…',
  }
}

function resolveObservedMsPerWeight(snapshot: V7ProductionSnapshot): number | null {
  let weightedMs = 0
  let completedWeight = 0

  for (const stageId of Object.keys(V7_STAGE_WEIGHTS) as V7StageId[]) {
    const weight = V7_STAGE_WEIGHTS[stageId] ?? 0
    if (weight <= 0) continue

    const row = stageRow(snapshot, stageId)
    if (row?.status !== 'completed') continue

    const durationMs = readStageDurationMs(row)
    if (durationMs == null) continue

    weightedMs += durationMs
    completedWeight += weight
  }

  if (completedWeight <= 0 || weightedMs <= 0) return null
  return weightedMs / completedWeight
}

function computeEta(params: {
  snapshot: V7ProductionSnapshot
  now: Date
  completedWeight: number
  remainingWeight: number
  frozen: boolean
}): V7ProductionProgressEta {
  if (params.snapshot.production.status === 'completed' || v7HasDeliverableMedia(params.snapshot.production)) {
    return { remainingMs: 0, completionAt: params.now, frozen: false, label: 'Complete' }
  }

  if (params.frozen) {
    return {
      remainingMs: null,
      completionAt: null,
      frozen: true,
      label: 'Paused',
    }
  }

  if (params.remainingWeight <= 0) {
    return {
      remainingMs: null,
      completionAt: null,
      frozen: false,
      label: 'Finishing up…',
    }
  }

  const runningStage = params.snapshot.stages.find((row) => row.status === 'running')
  const observedMsPerWeight = resolveObservedMsPerWeight(params.snapshot)

  if (observedMsPerWeight != null) {
    const remainingMs = Math.max(0, Math.round(params.remainingWeight * observedMsPerWeight))
    const completionAt = new Date(params.now.getTime() + remainingMs)
    return {
      remainingMs,
      completionAt,
      frozen: false,
      label: formatRemainingLabel(remainingMs),
    }
  }

  if (runningStage) {
    return {
      remainingMs: null,
      completionAt: null,
      frozen: false,
      label: 'Generating…',
    }
  }

  return {
    remainingMs: null,
    completionAt: null,
    frozen: false,
    label: 'Estimating…',
  }
}

export function formatRemainingLabel(remainingMs: number): string {
  if (remainingMs <= 0) return 'Finishing up…'
  if (remainingMs < 60_000) {
    const seconds = Math.max(1, Math.ceil(remainingMs / 1000))
    return `~${seconds}s remaining`
  }
  const minutes = Math.floor(remainingMs / 60_000)
  const seconds = Math.ceil((remainingMs % 60_000) / 1000)
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `~${hours}h ${mins}m remaining`
  }
  return seconds > 0 ? `~${minutes}m ${seconds}s remaining` : `~${minutes}m remaining`
}

export function formatCompletionClock(date: Date, now: Date = new Date()): string {
  const sameDay = date.toDateString() === now.toDateString()
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    ...(sameDay ? {} : { month: 'short', day: 'numeric' }),
  })
}

function readStageDurationMs(stage: V7StageRow | undefined): number | null {
  const durationMs = stage?.output?.durationMs
  return typeof durationMs === 'number' && durationMs > 0 ? durationMs : null
}

function buildCompletionStats(snapshot: V7ProductionSnapshot): V7ProductionCompletionStats {
  const createdAt = new Date(snapshot.production.created_at).getTime()
  const exportStage = stageRow(snapshot, 'export')
  const renderStage = stageRow(snapshot, 'render')
  const completedAt = exportStage?.completed_at ?? renderStage?.completed_at

  const totalGenerationMs =
    completedAt != null
      ? Math.max(0, new Date(completedAt).getTime() - createdAt)
      : snapshot.stages.reduce((sum, row) => sum + (readStageDurationMs(row) ?? 0), 0)

  const sceneTimes: number[] = []
  for (const scene of snapshot.scenes) {
    const board = parseStoryboard(scene.storyboard ?? {})
    const imageMs = board.imageMetadata?.generationTimeMs
    const videoMs = board.videoMetadata?.generationTimeMs
    if (typeof imageMs === 'number' && imageMs > 0) sceneTimes.push(imageMs)
    if (typeof videoMs === 'number' && videoMs > 0) sceneTimes.push(videoMs)
  }

  const averageSceneGenerationMs =
    sceneTimes.length > 0
      ? Math.round(sceneTimes.reduce((sum, value) => sum + value, 0) / sceneTimes.length)
      : null

  return {
    totalGenerationMs,
    renderMs: readStageDurationMs(renderStage),
    averageSceneGenerationMs,
  }
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remSec = seconds % 60
  if (minutes < 60) return remSec > 0 ? `${minutes}m ${remSec}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`
}
