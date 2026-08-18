import 'server-only'

import { randomUUID } from 'crypto'

import { getV7Production, updateV7Production, upsertV7Stage } from '@/lib/v7/db.server'
import { V7_RUNNABLE_STAGES } from '@/lib/v7/pipeline'
import {
  detectProductionCompletionDrift,
  detectProductionStateDrift,
  getV7StaleRunningMs,
  isOrphanQueuedStageRow,
  isLiveGlobalPipelineLock,
  isV7PipelineLockActive,
  missingDeliverableUrlPatch,
  readV7PipelineLock,
  shouldRecoverV7PipelineLock,
  type V7PipelineLock,
} from '@/lib/v7/pipeline-state.core'
import { isAwaitingConceptSelection } from '@/lib/v7/concept-selection.server'
import {
  isProductionCancelled,
  readWorkspaceState,
} from '@/lib/v7/workspace/workspace-state.core'
import type { SupabaseServerClient } from '@/lib/supabase/server'
import { isEphemeralRemoteImageUrl } from '@/lib/image/ephemeral-image-url'
import type {
  V7CreativeBrief,
  V7AdvanceSnapshot,
  V7ProductionSnapshot,
  V7StageId,
  V7StageRow,
} from '@/types/v7/production'

const STALE_RUNNING_MS = 30 * 60 * 1000

function getStaleRunningMs(stage: V7StageId): number {
  return getV7StaleRunningMs(stage)
}

export const V7_PIPELINE_ORDER: V7StageId[] = ['idea', ...V7_RUNNABLE_STAGES]

export type V7StageStartCheck =
  | { ok: true }
  | { ok: false; reason: string; blocked: true }

export type { V7PipelineLock }

function readPipelineLock(timeline: Record<string, unknown> | null | undefined): V7PipelineLock | null {
  return readV7PipelineLock(timeline)
}

export function getPreviousPipelineStage(stage: V7StageId): V7StageId | null {
  const idx = V7_PIPELINE_ORDER.indexOf(stage)
  if (idx <= 0) return null
  return V7_PIPELINE_ORDER[idx - 1] ?? null
}

export function findRunningStage(stages: V7StageRow[]): V7StageRow | null {
  return stages.find((s) => s.status === 'running') ?? null
}

export function findFirstFailedStage(stages: V7StageRow[]): V7StageRow | null {
  for (const stageId of V7_RUNNABLE_STAGES) {
    const row = stages.find((s) => s.stage === stageId && s.status === 'failed')
    if (row) return row
  }
  return null
}

export function findNextQueuedStage(stages: V7StageRow[]): V7StageRow | null {
  for (const stageId of V7_RUNNABLE_STAGES) {
    const row = stages.find((s) => s.stage === stageId)
    if (row?.status === 'queued') return row
  }
  return null
}

function stageHasOutput(row: V7StageRow | undefined): boolean {
  if (!row || row.status !== 'completed') return false
  const output = row.output
  return output != null && typeof output === 'object' && Object.keys(output).length > 0
}

function hasDurableCompletedRender(snapshot: V7ProductionSnapshot): boolean {
  const render = snapshot.stages.find((row) => row.stage === 'render')
  return Boolean(snapshot.production.reel_url?.trim()) && render?.status === 'completed' && stageHasOutput(render)
}

export function validateImageStageComplete(snapshot: V7ProductionSnapshot): V7StageStartCheck {
  const imageStage = snapshot.stages.find((s) => s.stage === 'image')
  if (imageStage?.status !== 'completed') {
    return { ok: false, reason: 'Image generation still in progress', blocked: true }
  }
  if (!stageHasOutput(imageStage)) {
    return { ok: false, reason: 'Image stage checkpoint missing', blocked: true }
  }

  const images = imageStage.output?.images
  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, reason: 'Image stage output missing URLs', blocked: true }
  }

  if (snapshot.scenes.length === 0) {
    return { ok: false, reason: 'No storyboard scenes found', blocked: true }
  }

  for (const scene of snapshot.scenes) {
    const board = scene.storyboard as {
      imageUrl?: string
      imageMetadata?: Record<string, unknown>
      imageCheckpointAt?: string
    }
    const url = board.imageUrl?.trim()
    if (!url) {
      return { ok: false, reason: `Scene ${scene.number} image missing`, blocked: true }
    }
    if (isEphemeralRemoteImageUrl(url)) {
      return { ok: false, reason: `Scene ${scene.number} image not persisted`, blocked: true }
    }
    if (!board.imageCheckpointAt && !board.imageMetadata) {
      return { ok: false, reason: `Scene ${scene.number} checkpoint missing`, blocked: true }
    }
    const promptArchive = board.imageMetadata?.promptArchive as { action?: string } | undefined
    if (!promptArchive?.action?.trim()) {
      return {
        ok: false,
        reason: `Scene ${scene.number} image not grounded to screenplay`,
        blocked: true,
      }
    }
  }

  if (images.length < snapshot.scenes.length) {
    return {
      ok: false,
      reason: `Images incomplete (${images.length}/${snapshot.scenes.length})`,
      blocked: true,
    }
  }

  return { ok: true }
}

function validatePreviousStageOutput(
  previous: V7StageRow | undefined,
  stage: V7StageId
): V7StageStartCheck {
  if (!previous) {
    return { ok: false, reason: `Missing dependency before ${stage}`, blocked: true }
  }
  if (previous.status !== 'completed') {
    return {
      ok: false,
      reason: `Waiting for ${previous.stage} to complete`,
      blocked: true,
    }
  }
  if (!stageHasOutput(previous)) {
    return {
      ok: false,
      reason: `${previous.stage} checkpoint missing`,
      blocked: true,
    }
  }
  return { ok: true }
}

export function canStartStage(stage: V7StageId, snapshot: V7ProductionSnapshot): V7StageStartCheck {
  const running = findRunningStage(snapshot.stages)
  if (running && running.stage !== stage) {
    return {
      ok: false,
      reason: `${running.stage} is still running`,
      blocked: true,
    }
  }

  const previousId = getPreviousPipelineStage(stage)
  if (!previousId) {
    return { ok: true }
  }

  const previous = snapshot.stages.find((s) => s.stage === previousId)
  const previousCheck = validatePreviousStageOutput(previous, stage)
  if (!previousCheck.ok) return previousCheck

  if (stage === 'animation') {
    return validateImageStageComplete(snapshot)
  }

  if (stage === 'render') {
    const edit = snapshot.stages.find((s) => s.stage === 'edit')
    const quality = snapshot.stages.find((s) => s.stage === 'quality')
    if (edit?.status !== 'completed' || !snapshot.production.timeline_json) {
      return { ok: false, reason: 'Timeline edit not complete', blocked: true }
    }
    if (quality?.status !== 'completed') {
      return { ok: false, reason: 'Quality validation not complete', blocked: true }
    }
    const qualityOutput = quality.output as { passed?: boolean } | null
    if (qualityOutput?.passed === false) {
      return { ok: false, reason: 'Quality validation failed', blocked: true }
    }
  }

  if (stage === 'export') {
    if (!snapshot.production.reel_url?.trim()) {
      return { ok: false, reason: 'Render output missing', blocked: true }
    }
    const render = snapshot.stages.find((s) => s.stage === 'render')
    if (render?.status !== 'completed') {
      return { ok: false, reason: 'Render stage not complete', blocked: true }
    }
  }

  return { ok: true }
}

export function isStaleRunningStage(row: V7StageRow): boolean {
  if (row.status !== 'running' || !row.started_at) return false
  return Date.now() - Date.parse(row.started_at) > getStaleRunningMs(row.stage)
}

function isStageTrulyComplete(
  stageId: V7StageId,
  row: V7StageRow | undefined,
  snapshot: V7ProductionSnapshot
): boolean {
  if (!row || row.status !== 'completed') return false
  if (!stageHasOutput(row)) return false
  if (stageId === 'image') {
    return validateImageStageComplete(snapshot).ok
  }
  return true
}

function productionFieldsToClearFromStage(stageId: V7StageId): {
  voice_url?: null
  music_url?: null
  reel_url?: null
  thumbnail_url?: null
  mov_url?: null
  creator_pack_url?: null
  export_status?: 'pending'
} {
  const idx = V7_RUNNABLE_STAGES.indexOf(stageId)
  if (idx < 0) return {}

  const patch: ReturnType<typeof productionFieldsToClearFromStage> = {}
  if (idx <= V7_RUNNABLE_STAGES.indexOf('voice')) patch.voice_url = null
  if (idx <= V7_RUNNABLE_STAGES.indexOf('music')) patch.music_url = null
  if (idx <= V7_RUNNABLE_STAGES.indexOf('render')) {
    patch.reel_url = null
    patch.thumbnail_url = null
    patch.export_status = 'pending'
  }
  if (idx <= V7_RUNNABLE_STAGES.indexOf('export')) {
    patch.mov_url = null
    patch.creator_pack_url = null
  }
  return patch
}

async function persistMissingDeliverableUrls(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  snapshot: V7ProductionSnapshot
}): Promise<V7ProductionSnapshot> {
  const mediaPatch = missingDeliverableUrlPatch(params.snapshot)
  if (Object.keys(mediaPatch).length === 0) return params.snapshot
  await updateV7Production(params.supabase, params.productionId, params.userId, mediaPatch)
  return (await getV7Production(params.supabase, params.productionId, params.userId)) ?? params.snapshot
}

/** Repair production.status/current_stage when a stage completed but production stayed failed. */
export async function reconcileProductionStateDrift(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  snapshot: V7ProductionSnapshot
}): Promise<V7ProductionSnapshot | null> {
  const drift = detectProductionStateDrift(params.snapshot)
  if (!drift.recoverable || !drift.resumeStage) {
    return params.snapshot
  }

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    status: 'producing',
    current_stage: drift.resumeStage,
  })

  return getV7Production(params.supabase, params.productionId, params.userId)
}

/** Align production.status when export checkpoint + reel are already finalized. */
export async function reconcileProductionCompletionDrift(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  snapshot: V7ProductionSnapshot
}): Promise<V7ProductionSnapshot | null> {
  if (!detectProductionCompletionDrift(params.snapshot)) {
    return params.snapshot
  }

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    status: 'completed',
    current_stage: 'export',
  })

  return getV7Production(params.supabase, params.productionId, params.userId)
}

export async function recoverStalePipelineLock(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  snapshot: V7ProductionSnapshot
}): Promise<V7ProductionSnapshot | null> {
  const lock = readPipelineLock(params.snapshot.production.timeline_json as Record<string, unknown> | null)
  const runningStage = findRunningStage(params.snapshot.stages)
  if (!shouldRecoverV7PipelineLock({ lock, runningStage })) {
    return params.snapshot
  }

  await releaseProductionLock({
    supabase: params.supabase,
    productionId: params.productionId,
    userId: params.userId,
    token: null,
  })

  return getV7Production(params.supabase, params.productionId, params.userId)
}

/** Reset stages that completed out of order or stale running locks. */
export async function reconcilePipelineIntegrity(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  snapshot: V7ProductionSnapshot
}): Promise<V7ProductionSnapshot | null> {
  let snapshot =
    (await reconcileProductionStateDrift({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
      snapshot: params.snapshot,
    })) ?? params.snapshot

  snapshot =
    (await reconcileProductionCompletionDrift({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
      snapshot,
    })) ?? snapshot

  snapshot =
    (await recoverStalePipelineLock({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
      snapshot,
    })) ?? snapshot

  if (hasDurableCompletedRender(snapshot)) {
    return persistMissingDeliverableUrls({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
      snapshot,
    })
  }

  let changed = false
  let resumeStage: V7StageId | null = null

  for (const stageId of V7_PIPELINE_ORDER) {
    const row = snapshot.stages.find((s) => s.stage === stageId)
    if (!isOrphanQueuedStageRow(row)) continue

    await upsertV7Stage(params.supabase, {
      productionId: params.productionId,
      stage: stageId,
      status: 'queued',
      input: row?.input ?? null,
      output: null,
      error: row?.error ?? null,
    })
    changed = true
    if (!resumeStage) resumeStage = stageId
  }

  const ideaRow = snapshot.stages.find((s) => s.stage === 'idea')
  if (ideaRow?.status === 'running' && isStaleRunningStage(ideaRow)) {
    await recoverStaleRunningStage({
      supabase: params.supabase,
      productionId: params.productionId,
      row: ideaRow,
    })
    changed = true
    resumeStage = 'idea'
  }

  for (const stageId of V7_RUNNABLE_STAGES) {
    const row = snapshot.stages.find((s) => s.stage === stageId)
    if (row?.status !== 'running') continue

    if (!isStaleRunningStage(row)) {
      return persistMissingDeliverableUrls({
        supabase: params.supabase,
        productionId: params.productionId,
        userId: params.userId,
        snapshot,
      })
    }

    await recoverStaleRunningStage({
      supabase: params.supabase,
      productionId: params.productionId,
      row,
    })
    changed = true
    resumeStage = stageId
  }

  let lastCompleteIdx = -1
  for (let i = 0; i < V7_RUNNABLE_STAGES.length; i++) {
    const stageId = V7_RUNNABLE_STAGES[i]!
    const row = snapshot.stages.find((s) => s.stage === stageId)
    if (isStageTrulyComplete(stageId, row, snapshot)) {
      lastCompleteIdx = i
      continue
    }
    if (row?.status === 'completed') {
      await upsertV7Stage(params.supabase, {
        productionId: params.productionId,
        stage: stageId,
        status: 'queued',
        output: null,
        error: null,
      })
      changed = true
      resumeStage = stageId
    }
    break
  }

  for (let i = lastCompleteIdx + 1; i < V7_RUNNABLE_STAGES.length; i++) {
    const stageId = V7_RUNNABLE_STAGES[i]!
    const row = snapshot.stages.find((s) => s.stage === stageId)
    if (
      row &&
      (row.status === 'completed' || row.status === 'running' || row.status === 'failed')
    ) {
      await upsertV7Stage(params.supabase, {
        productionId: params.productionId,
        stage: stageId,
        status: 'queued',
        output: null,
        error: null,
      })
      changed = true
      if (!resumeStage) resumeStage = stageId
    }
  }

  if (!changed) {
    return persistMissingDeliverableUrls({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
      snapshot,
    })
  }

  const nextStage =
    resumeStage ??
    (lastCompleteIdx + 1 < V7_RUNNABLE_STAGES.length
      ? V7_RUNNABLE_STAGES[lastCompleteIdx + 1]!
      : null)

  if (!nextStage) {
    return getV7Production(params.supabase, params.productionId, params.userId)
  }

  await releaseProductionLock({
    supabase: params.supabase,
    productionId: params.productionId,
    userId: params.userId,
    token: null,
  })

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    status: 'producing',
    current_stage: nextStage,
    ...productionFieldsToClearFromStage(nextStage),
  })

  return getV7Production(params.supabase, params.productionId, params.userId)
}

export async function recoverStaleRunningStage(params: {
  supabase: SupabaseServerClient
  productionId: string
  row: V7StageRow
}): Promise<void> {
  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: params.row.stage,
    status: 'queued',
    error: 'Recovered from stale in-progress stage',
    output: null,
  })
}

export async function markStageBlocked(params: {
  supabase: SupabaseServerClient
  productionId: string
  stage: V7StageId
  reason: string
  input?: Record<string, unknown> | null
}): Promise<void> {
  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: params.stage,
    status: 'queued',
    input: params.input ?? null,
    output: { pipeline_blocked: true, block_reason: params.reason },
    error: null,
  })
}

export async function clearStageBlocked(params: {
  supabase: SupabaseServerClient
  productionId: string
  stage: V7StageId
  input?: Record<string, unknown> | null
}): Promise<void> {
  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: params.stage,
    status: 'queued',
    input: params.input ?? null,
    output: null,
    error: null,
  })
}

export async function enqueueNextPipelineStage(params: {
  supabase: SupabaseServerClient
  productionId: string
  completedStage: V7StageId
  brief: V7CreativeBrief
}): Promise<void> {
  const idx = V7_RUNNABLE_STAGES.indexOf(params.completedStage)
  if (idx < 0) return
  const next = V7_RUNNABLE_STAGES[idx + 1]
  if (!next) return

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: next,
    status: 'queued',
    input: { brief: params.brief },
    output: null,
    error: null,
  })
}

/** Returns the production currently holding the global execution slot, if any. */
export async function findGloballyLockedV7Production(
  supabase: SupabaseServerClient,
  excludeProductionId?: string
): Promise<{ productionId: string; userId: string } | null> {
  const { data, error } = await supabase
    .from('v7_productions')
    .select('id,user_id,timeline_json')
    .eq('status', 'producing')
    .limit(100)

  if (error) throw new Error(error.message)

  for (const row of data ?? []) {
    if (excludeProductionId && row.id === excludeProductionId) continue
    const lock = readPipelineLock((row.timeline_json ?? {}) as Record<string, unknown>)
    if (!lock?.locked || !isV7PipelineLockActive(lock)) continue

    const snapshot = await getV7Production(supabase, row.id, row.user_id)
    if (!snapshot) continue

    const running = findRunningStage(snapshot.stages)
    if (
      !isLiveGlobalPipelineLock({
        lock,
        runningStage: running,
      })
    ) {
      continue
    }

    return { productionId: row.id, userId: row.user_id }
  }

  return null
}

export async function acquireProductionLock(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  stage: V7StageId
}): Promise<{ acquired: boolean; token: string | null }> {
  const globalLock = await findGloballyLockedV7Production(params.supabase, params.productionId)
  if (globalLock) {
    return { acquired: false, token: null }
  }

  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) return { acquired: false, token: null }

  const timeline = (snapshot.production.timeline_json ?? {}) as Record<string, unknown>
  const existing = readPipelineLock(timeline)
  const running = findRunningStage(snapshot.stages)

  if (isLiveGlobalPipelineLock({ lock: existing, runningStage: running })) {
    return { acquired: false, token: null }
  }

  const token = randomUUID()
  await updateV7Production(params.supabase, params.productionId, params.userId, {
    timeline_json: {
      ...timeline,
      pipeline_lock: {
        locked: true,
        stage: params.stage,
        since: new Date().toISOString(),
        token,
      },
    },
  })

  return { acquired: true, token }
}

export async function releaseProductionLock(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  token: string | null
}): Promise<void> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) return

  const timeline = (snapshot.production.timeline_json ?? {}) as Record<string, unknown>
  const existing = readPipelineLock(timeline)
  if (existing?.token && params.token && existing.token !== params.token) {
    return
  }

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    timeline_json: {
      ...timeline,
      pipeline_lock: {
        locked: false,
        since: new Date().toISOString(),
      },
    },
  })
}

export function shouldDrivePipeline(snapshot: V7ProductionSnapshot): boolean {
  const status = snapshot.production.status
  if (status !== 'producing' && status !== 'planning') return false

  if (isProductionCancelled(readWorkspaceState(snapshot.production.timeline_json))) {
    return false
  }

  const ideaStage = snapshot.stages.find((s) => s.stage === 'idea')
  if (ideaStage?.status !== 'completed') {
    if (ideaStage?.status === 'queued') {
      if (findRunningStage(snapshot.stages)) return false
      const lock = readPipelineLock(snapshot.production.timeline_json as Record<string, unknown> | null)
      if (isLiveGlobalPipelineLock({ lock, runningStage: findRunningStage(snapshot.stages) })) {
        return false
      }
      return true
    }
    return false
  }

  if (isAwaitingConceptSelection(snapshot.production.timeline_json)) return false

  if (findFirstFailedStage(snapshot.stages)) return false

  const running = findRunningStage(snapshot.stages)
  if (running) return false

  const lock = readPipelineLock(snapshot.production.timeline_json as Record<string, unknown> | null)
  const runningForLock = findRunningStage(snapshot.stages)
  if (isLiveGlobalPipelineLock({ lock, runningStage: runningForLock })) {
    return false
  }

  return Boolean(findNextQueuedStage(snapshot.stages))
}

export function toV7AdvanceSnapshot(
  snapshot: V7ProductionSnapshot,
  options: { blocked: boolean; reason?: string }
): V7AdvanceSnapshot {
  return {
    production: snapshot.production,
    stages: snapshot.stages,
    scenes: snapshot.scenes,
    timeline: snapshot.timeline,
    pipeline_blocked: options.blocked,
    block_reason: options.blocked ? options.reason : undefined,
  }
}
