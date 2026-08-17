import 'server-only'

import { randomUUID } from 'crypto'

import type { V7ScriptDocument } from '@/agents/v7/script-schema'
import { validateScreenplayDocument } from '@/agents/v7/script-schema'
import type { SupabaseServerClient } from '@/lib/supabase/server'
import {
  getV7Production,
  updateV7Production,
  upsertV7Stage,
} from '@/lib/v7/db.server'
import { V7_RUNNABLE_STAGES } from '@/lib/v7/pipeline'
import { advanceV7Production } from '@/lib/v7/orchestrator.server'
import { shouldDrivePipeline, releaseProductionLock } from '@/lib/v7/pipeline-sync.server'
import { runV7ImageOrchestrator } from '@/lib/v7/image-scene.server'
import { runV7VideoOrchestrator } from '@/lib/v7/video-scene.server'
import { loadV7StageBibles, buildV7ScenePackages } from '@/lib/v7/scene-package.server'
import type { V7ScriptScene } from '@/lib/v7/scene-grounding.server'
import {
  buildStaleMarkers,
  downstreamStagesForEdit,
  firstRegenerationStage,
} from '@/lib/v7/workspace/workspace-dependencies.core'
import {
  applyScriptSceneEdits,
  createScriptVersionId,
  extractScriptFromStageOutput,
  type ScriptReviewScene,
} from '@/lib/v7/workspace/workspace-script.core'
import {
  buildContinuationContext,
  mergeScriptDocumentWithInsertion,
  orderSceneRenumberingShifts,
  planSceneInsertion,
} from '@/lib/v7/workspace/workspace-continuation.core'
import {
  buildKeepExistingProductionPatch,
  buildScriptEditProductionPatch,
  snapshotDeliverableRefs,
} from '@/lib/v7/workspace/workspace-editing.core'
import { buildWorkspacePayload, type WorkspacePayload } from '@/lib/v7/workspace/workspace-view.core'
import {
  clearStaleStages,
  markStagesStale,
  mergeWorkspaceState,
  readWorkspaceFromSnapshot,
  readWorkspaceState,
} from '@/lib/v7/workspace/workspace-state.core'
import type { V7ProductionSnapshot, V7StageId } from '@/types/v7/production'
import type { V7CreativeDirection } from '@/agents/v7/creative-director.server'
import type { V7StoryboardDocument } from '@/agents/v7/storyboard.server'

export type WorkspaceAction = 'cancel' | 'close' | 'reopen'

export async function getV7WorkspacePayload(
  supabase: SupabaseServerClient,
  productionId: string,
  userId: string
): Promise<{ snapshot: V7ProductionSnapshot; workspace: WorkspacePayload } | null> {
  const snapshot = await getV7Production(supabase, productionId, userId)
  if (!snapshot) return null
  return { snapshot, workspace: buildWorkspacePayload(snapshot) }
}

export async function applyV7WorkspaceAction(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  action: WorkspaceAction
}): Promise<V7ProductionSnapshot | null> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) return null

  const workspace = readWorkspaceFromSnapshot(snapshot)
  const now = new Date().toISOString()
  let patch: Record<string, unknown>

  switch (params.action) {
    case 'cancel':
      patch = mergeWorkspaceState(snapshot.production.timeline_json, {
        cancelledAt: now,
      })
      break
    case 'close':
      patch = mergeWorkspaceState(snapshot.production.timeline_json, {
        closedAt: now,
      })
      break
    case 'reopen':
      patch = mergeWorkspaceState(snapshot.production.timeline_json, {
        closedAt: null,
      })
      break
  }

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    timeline_json: patch,
  })

  return getV7Production(params.supabase, params.productionId, params.userId)
}

export async function saveV7ScriptEdit(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  scenes: Array<Partial<ScriptReviewScene> & { number: number }>
}): Promise<V7ProductionSnapshot | null> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) return null

  const scriptStage = snapshot.stages.find((row) => row.stage === 'script')
  const currentScript = extractScriptFromStageOutput(scriptStage?.output)
  if (!currentScript) throw new Error('Script not available for editing')

  const nextScript = applyScriptSceneEdits(currentScript, params.scenes)
  const validated = validateScreenplayDocument(nextScript)
  if (!validated.ok) {
    throw new Error(validated.errors.join('; '))
  }

  const now = new Date().toISOString()
  const versionId = createScriptVersionId()
  const workspace = readWorkspaceFromSnapshot(snapshot)
  const versions = [...(workspace.scriptVersions ?? [])]
  versions.unshift({ id: versionId, savedAt: now, summary: 'Script edit' })

  const staleMarkers = buildStaleMarkers({
    source: 'script',
    reason: 'Script updated',
    staleAt: now,
  })

  const nextWorkspace = markStagesStale({
    workspace: {
      ...workspace,
      scriptVersions: versions.slice(0, 20),
      currentScriptVersionId: versionId,
      lastEditAt: now,
      lastEditType: 'script',
    },
    markers: staleMarkers,
  })

  for (const scene of validated.data.scenes) {
    const row = snapshot.scenes.find((entry) => entry.number === scene.number)
    if (!row) continue
    await params.supabase
      .from('v7_scenes')
      .update({ script: scene as unknown as Record<string, unknown>, duration: scene.duration })
      .eq('id', row.id)
  }

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: 'script',
    status: 'completed',
    output: {
      ...(scriptStage?.output as Record<string, unknown> | null),
      script: validated.data,
      previousScript: currentScript,
      versionId,
      savedAt: now,
    },
  })

  await updateV7Production(
    params.supabase,
    params.productionId,
    params.userId,
    buildScriptEditProductionPatch({
      timelineJson: snapshot.production.timeline_json,
      nextWorkspace,
      preservedDeliverables: snapshotDeliverableRefs(snapshot.production),
    })
  )

  return getV7Production(params.supabase, params.productionId, params.userId)
}

export async function saveV7VoiceEdit(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  narrationSegments: Array<{ sceneNumber: number; text: string }>
}): Promise<V7ProductionSnapshot | null> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) return null

  const now = new Date().toISOString()
  const workspace = readWorkspaceFromSnapshot(snapshot)
  const staleMarkers = buildStaleMarkers({
    source: 'voice',
    reason: 'Voiceover updated',
    staleAt: now,
  })

  const nextWorkspace = markStagesStale({
    workspace: {
      ...workspace,
      lastEditAt: now,
      lastEditType: 'voice',
    },
    markers: staleMarkers,
  })

  const voiceStage = snapshot.stages.find((row) => row.stage === 'voice')
  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: 'voice',
    status: voiceStage?.status === 'completed' ? 'completed' : 'queued',
    output: {
      ...(voiceStage?.output as Record<string, unknown> | null),
      pendingNarrationSegments: params.narrationSegments,
      pendingRegenerationAt: now,
    },
  })

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    timeline_json: mergeWorkspaceState(snapshot.production.timeline_json, nextWorkspace),
    export_status: 'pending',
    reel_url: null,
    thumbnail_url: null,
    mov_url: null,
    creator_pack_url: null,
  })

  return getV7Production(params.supabase, params.productionId, params.userId)
}

export async function keepExistingV7Outputs(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
}): Promise<V7ProductionSnapshot | null> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) return null

  const now = new Date().toISOString()
  const workspace = readWorkspaceFromSnapshot(snapshot)
  const { timeline_json, deliverablePatch } = buildKeepExistingProductionPatch({
    timelineJson: snapshot.production.timeline_json,
    workspace,
    now,
    production: snapshot.production,
  })

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    timeline_json,
    ...deliverablePatch,
  })

  return getV7Production(params.supabase, params.productionId, params.userId)
}

export async function regenerateAffectedV7Stages(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
}): Promise<V7ProductionSnapshot | null> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) return null

  const workspace = readWorkspaceFromSnapshot(snapshot)
  const editType = workspace.lastEditType ?? 'script'
  const fromStage = firstRegenerationStage(
    editType === 'continuation' ? 'continuation' : editType === 'scene' ? 'scene' : editType
  )

  await releaseProductionLock({
    supabase: params.supabase,
    productionId: params.productionId,
    userId: params.userId,
    token: null,
  })

  const fromIndex = V7_RUNNABLE_STAGES.indexOf(fromStage)
  for (const stageId of V7_RUNNABLE_STAGES) {
    const stageIndex = V7_RUNNABLE_STAGES.indexOf(stageId)
    if (stageIndex < fromIndex) continue
    await upsertV7Stage(params.supabase, {
      productionId: params.productionId,
      stage: stageId,
      status: 'queued',
      error: null,
      output: null,
    })
  }

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    status: 'producing',
    current_stage: fromStage,
    timeline_json: mergeWorkspaceState(snapshot.production.timeline_json, clearStaleStages(workspace)),
    export_status: 'pending',
    reel_url: null,
    thumbnail_url: null,
    mov_url: null,
    creator_pack_url: null,
  })

  let current = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!current) return null

  const maxAdvances = V7_RUNNABLE_STAGES.length + 2
  for (let attempt = 0; attempt < maxAdvances; attempt++) {
    if (!shouldDrivePipeline(current)) break
    await advanceV7Production({
      supabase: params.supabase,
      productionId: params.productionId,
      userId: params.userId,
    })
    const refreshed = await getV7Production(params.supabase, params.productionId, params.userId)
    if (!refreshed) break
    current = refreshed
    if (current.production.status === 'completed' || current.production.status === 'failed') break
  }

  return current
}

function loadStageContext(snapshot: V7ProductionSnapshot) {
  const brief = snapshot.production.creative_brief
  if (!brief) throw new Error('Creative brief missing')

  const scriptStage = snapshot.stages.find((row) => row.stage === 'script')
  const storyboardStage = snapshot.stages.find((row) => row.stage === 'storyboard')
  const creativeStage = snapshot.stages.find((row) => row.stage === 'creative')

  const script = extractScriptFromStageOutput(scriptStage?.output)
  const storyboard = (storyboardStage?.output as { storyboard?: V7StoryboardDocument } | null)?.storyboard
  const direction = (creativeStage?.output as { direction?: V7CreativeDirection } | null)?.direction

  if (!script || !storyboard || !direction) {
    throw new Error('Script, storyboard, or creative direction missing')
  }

  const bibles = loadV7StageBibles(snapshot)
  return { brief, script, storyboard, direction, bibles }
}

export async function continueV7Scene(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  afterSceneId: string
  continuationIdea: string
  narration?: string
  durationSec?: number
  generateMedia?: boolean
}): Promise<{ snapshot: V7ProductionSnapshot; plan: ReturnType<typeof planSceneInsertion> } | null> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) return null

  const packages = buildV7ScenePackages(snapshot)
  const sourcePackage = packages.find((pkg) => pkg.sceneId === params.afterSceneId)
  if (!sourcePackage) throw new Error('Source scene not found')

  const plan = planSceneInsertion({
    scenes: snapshot.scenes,
    afterSceneId: params.afterSceneId,
    continuationIdea: params.continuationIdea,
    narration: params.narration,
    durationSec: params.durationSec,
    sourcePackage,
  })
  if (!plan) throw new Error('Could not plan scene insertion')

  for (const shift of orderSceneRenumberingShifts(plan.renumbered)) {
    const row = snapshot.scenes.find((scene) => scene.id === shift.sceneId)
    if (!row) continue
    const scriptScene = row.script as V7ScriptScene
    const { error: renumberError } = await params.supabase
      .from('v7_scenes')
      .update({
        number: shift.to,
        script: { ...scriptScene, number: shift.to } as unknown as Record<string, unknown>,
      })
      .eq('id', shift.sceneId)
    if (renumberError) throw new Error(renumberError.message)
  }

  const { error: insertError } = await params.supabase.from('v7_scenes').insert({
    id: plan.newSceneId,
    production_id: params.productionId,
    number: plan.newSceneNumber,
    script: plan.scriptScene as unknown as Record<string, unknown>,
    duration: plan.scriptScene.duration,
    storyboard: {
      continuationOf: params.afterSceneId,
      continuationContext: buildContinuationContext({ source: sourcePackage, continuationIdea: params.continuationIdea }),
    },
  })
  if (insertError) throw new Error(insertError.message)

  const { brief, script, storyboard, direction, bibles } = loadStageContext(snapshot)
  const nextScript = mergeScriptDocumentWithInsertion({ script, plan })
  const nextStoryboard: V7StoryboardDocument = {
    scenes: [
      ...storyboard.scenes.map((scene) => {
        const renumbered = plan.renumbered.find((row) => row.from === scene.number)
        return renumbered ? { ...scene, number: renumbered.to } : scene
      }),
      {
        number: plan.newSceneNumber,
        shots: [
          {
            dialogue: '',
            emotion: plan.scriptScene.emotion,
            composition: plan.scriptScene.camera,
            camera: plan.scriptScene.camera,
            lens: '35mm',
            movement: plan.scriptScene.movement,
            lighting: plan.scriptScene.lighting,
            timing: plan.scriptScene.duration,
          },
        ],
      },
    ].sort((a, b) => a.number - b.number),
  }

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: 'storyboard',
    status: 'completed',
    output: {
      storyboard: nextStoryboard,
      continuationUpdatedAt: new Date().toISOString(),
    },
  })

  await upsertV7Stage(params.supabase, {
    productionId: params.productionId,
    stage: 'script',
    status: 'completed',
    output: {
      script: nextScript,
      continuationInsertedAt: new Date().toISOString(),
    },
  })

  const now = new Date().toISOString()
  const workspace = readWorkspaceFromSnapshot(snapshot)
  const staleMarkers = buildStaleMarkers({
    source: 'continuation',
    reason: `Scene continuation after Scene ${sourcePackage.sceneNumber}`,
    staleAt: now,
    sceneId: plan.newSceneId,
    sceneNumber: plan.newSceneNumber,
  })

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    creative_brief: { ...brief, sceneCount: nextScript.scenes.length },
    timeline_json: mergeWorkspaceState(snapshot.production.timeline_json, markStagesStale({
      workspace: {
        ...workspace,
        lastEditAt: now,
        lastEditType: 'continuation',
      },
      markers: staleMarkers,
    })),
    export_status: 'pending',
    reel_url: null,
    thumbnail_url: null,
    mov_url: null,
    creator_pack_url: null,
  })

  if (params.generateMedia) {
    await runV7ImageOrchestrator({
      brief,
      direction,
      script: nextScript,
      storyboard: nextStoryboard,
      scenes: [{ id: plan.newSceneId, number: plan.newSceneNumber }],
      productionId: params.productionId,
      characterBible: bibles.characterBible,
      worldBible: bibles.worldBible,
      supabase: params.supabase,
      forceRegenerate: true,
    })

    await runV7VideoOrchestrator({
      brief,
      direction,
      script: nextScript,
      storyboard: nextStoryboard,
      scenes: [{ id: plan.newSceneId, number: plan.newSceneNumber, storyboard: {} }],
      productionId: params.productionId,
      supabase: params.supabase,
    })
  }

  const refreshed = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!refreshed) return null
  return { snapshot: refreshed, plan }
}

export async function regenerateV7SceneMedia(params: {
  supabase: SupabaseServerClient
  productionId: string
  userId: string
  sceneId: string
}): Promise<V7ProductionSnapshot | null> {
  const snapshot = await getV7Production(params.supabase, params.productionId, params.userId)
  if (!snapshot) return null

  const scene = snapshot.scenes.find((row) => row.id === params.sceneId)
  if (!scene) throw new Error('Scene not found')

  const { brief, script, storyboard, direction, bibles } = loadStageContext(snapshot)

  await runV7ImageOrchestrator({
    brief,
    direction,
    script,
    storyboard,
    scenes: [{ id: scene.id, number: scene.number }],
    productionId: params.productionId,
    characterBible: bibles.characterBible,
    worldBible: bibles.worldBible,
    supabase: params.supabase,
    forceRegenerate: true,
  })

  await runV7VideoOrchestrator({
    brief,
    direction,
    script,
    storyboard,
    scenes: [{ id: scene.id, number: scene.number, storyboard: scene.storyboard ?? {} }],
    productionId: params.productionId,
    supabase: params.supabase,
  })

  const now = new Date().toISOString()
  const workspace = readWorkspaceFromSnapshot(snapshot)
  const staleMarkers = buildStaleMarkers({
    source: 'scene',
    reason: `Scene ${scene.number} regenerated`,
    staleAt: now,
    sceneId: scene.id,
    sceneNumber: scene.number,
  })

  await updateV7Production(params.supabase, params.productionId, params.userId, {
    timeline_json: mergeWorkspaceState(snapshot.production.timeline_json, markStagesStale({
      workspace: {
        ...workspace,
        lastEditAt: now,
        lastEditType: 'scene',
      },
      markers: [
        ...staleMarkers,
        ...buildStaleMarkers({
          source: 'scene',
          reason: `Scene ${scene.number} regenerated`,
          staleAt: now,
          sceneId: scene.id,
          sceneNumber: scene.number,
        }).filter((marker) => ['edit', 'quality', 'render', 'export'].includes(marker.stageId)),
      ],
    })),
    export_status: 'pending',
    reel_url: null,
    thumbnail_url: null,
    mov_url: null,
    creator_pack_url: null,
  })

  return getV7Production(params.supabase, params.productionId, params.userId)
}

export function isWorkspaceProductionCancelled(timelineJson: Record<string, unknown> | null): boolean {
  return readWorkspaceState(timelineJson).cancelledAt != null
}

export function resolveWorkspaceClosed(timelineJson: Record<string, unknown> | null): boolean {
  return readWorkspaceState(timelineJson).closedAt != null
}

export function listDownstreamForLastEdit(
  timelineJson: Record<string, unknown> | null
): V7StageId[] {
  const workspace = readWorkspaceState(timelineJson)
  const editType = workspace.lastEditType ?? 'script'
  return downstreamStagesForEdit(
    editType === 'continuation'
      ? 'continuation'
      : editType === 'scene'
        ? 'scene'
        : editType === 'voice'
          ? 'voice'
          : 'script'
  )
}

export function newSceneId(): string {
  return randomUUID()
}
