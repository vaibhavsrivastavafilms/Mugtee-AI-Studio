import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import {
  V7_STAGE_LABELS,
  type V7CreativeBrief,
  type V7ProductionRow,
  type V7ProductionSnapshot,
  type V7SceneRow,
  type V7StageId,
  type V7StageRow,
  type V7StageStatus,
  type V7TimelineStage,
} from '@/types/v7/production'
import { V7_ALL_STAGES } from '@/lib/v7/pipeline'

export function buildTimeline(stages: V7StageRow[]): V7TimelineStage[] {
  const byStage = new Map(stages.map((s) => [s.stage, s]))

  return V7_ALL_STAGES.map((id) => {
    const row = byStage.get(id)
    const meta = V7_STAGE_LABELS[id]
    let status: V7TimelineStage['status'] = 'pending'
    if (row?.status === 'running') status = 'running'
    else if (row?.status === 'completed') status = 'completed'
    else if (row?.status === 'failed') status = 'failed'
    else if (
      row?.output &&
      typeof row.output === 'object' &&
      (row.output as { pipeline_blocked?: boolean }).pipeline_blocked
    ) {
      status = 'blocked'
    }

    return {
      id,
      label: meta.label,
      emoji: meta.emoji,
      status,
      error: row?.error ?? null,
    }
  })
}

export async function insertV7Production(
  supabase: SupabaseServerClient,
  params: { userId: string; prompt: string }
): Promise<V7ProductionRow> {
  const { data, error } = await supabase
    .from('v7_productions')
    .insert({
      user_id: params.userId,
      prompt: params.prompt,
      title: 'Untitled production',
      status: 'draft',
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create production')
  return data as V7ProductionRow
}

export async function updateV7Production(
  supabase: SupabaseServerClient,
  productionId: string,
  userId: string,
  patch: Partial<
    Pick<
      V7ProductionRow,
      | 'title'
      | 'status'
      | 'creative_brief'
      | 'current_stage'
      | 'reel_url'
      | 'mov_url'
      | 'thumbnail_url'
      | 'creator_pack_url'
      | 'export_status'
      | 'timeline_json'
      | 'voice_url'
      | 'music_url'
    >
  >
): Promise<void> {
  const { error } = await supabase
    .from('v7_productions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', productionId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function upsertV7Stage(
  supabase: SupabaseServerClient,
  params: {
    productionId: string
    stage: V7StageId
    status: V7StageStatus
    input?: Record<string, unknown> | null
    output?: Record<string, unknown> | null
    error?: string | null
  }
): Promise<void> {
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    production_id: params.productionId,
    stage: params.stage,
    status: params.status,
    input: params.input ?? null,
    output: params.output ?? null,
    error: params.error ?? null,
  }

  if (params.status === 'running') {
    patch.started_at = now
    patch.completed_at = null
  }
  if (params.status === 'queued') {
    patch.completed_at = null
  }
  if (params.status === 'completed' || params.status === 'failed') patch.completed_at = now

  const { error } = await supabase.from('v7_stages').upsert(patch, {
    onConflict: 'production_id,stage',
  })

  if (error) throw new Error(error.message)
}

export async function listV7Productions(
  supabase: SupabaseServerClient,
  userId: string
): Promise<V7ProductionRow[]> {
  const { data, error } = await supabase
    .from('v7_productions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as V7ProductionRow[]
}

/** Studio GET read path — omits heavy columns not used by the observational UI. */
const V7_STUDIO_READ_PRODUCTION_COLUMNS =
  'id,user_id,title,prompt,status,creative_brief,current_stage,reel_url,mov_url,thumbnail_url,creator_pack_url,export_status,timeline_json,created_at,updated_at'

/** Reconcile + progress need stage output; input is write-only payload and omitted. */
const V7_STUDIO_READ_STAGE_COLUMNS =
  'id,production_id,stage,status,error,started_at,completed_at,created_at,output'

/** Progress + thumbnails use storyboard; script payloads are omitted. */
const V7_STUDIO_READ_SCENE_COLUMNS =
  'id,production_id,number,storyboard,duration,created_at'

export type V7ProductionReadTiming = {
  productionMs: number
  relationsMs: number
}

export async function getV7ProductionForStudioRead(
  supabase: SupabaseServerClient,
  productionId: string,
  userId: string
): Promise<{ snapshot: V7ProductionSnapshot | null; timing: V7ProductionReadTiming }> {
  const readStarted = performance.now()
  const { data: production, error: prodError } = await supabase
    .from('v7_productions')
    .select(V7_STUDIO_READ_PRODUCTION_COLUMNS)
    .eq('id', productionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (prodError) throw new Error(prodError.message)
  if (!production) {
    return {
      snapshot: null,
      timing: {
        productionMs: Math.round(performance.now() - readStarted),
        relationsMs: 0,
      },
    }
  }

  const productionMs = Math.round(performance.now() - readStarted)
  const relationsStarted = performance.now()

  const [{ data: stages }, { data: scenes }] = await Promise.all([
    supabase
      .from('v7_stages')
      .select(V7_STUDIO_READ_STAGE_COLUMNS)
      .eq('production_id', productionId),
    supabase
      .from('v7_scenes')
      .select(V7_STUDIO_READ_SCENE_COLUMNS)
      .eq('production_id', productionId)
      .order('number'),
  ])

  const stageRows = (stages ?? []) as V7StageRow[]
  const sceneRows = (scenes ?? []) as V7SceneRow[]
  const timeline = buildTimeline(stageRows)

  return {
    snapshot: {
      production: production as V7ProductionRow,
      stages: stageRows,
      scenes: sceneRows,
      timeline,
    },
    timing: {
      productionMs,
      relationsMs: Math.round(performance.now() - relationsStarted),
    },
  }
}

export async function getV7Production(
  supabase: SupabaseServerClient,
  productionId: string,
  userId: string
): Promise<V7ProductionSnapshot | null> {
  const { data: production, error: prodError } = await supabase
    .from('v7_productions')
    .select('*')
    .eq('id', productionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (prodError) throw new Error(prodError.message)
  if (!production) return null

  const [{ data: stages }, { data: scenes }] = await Promise.all([
    supabase.from('v7_stages').select('*').eq('production_id', productionId),
    supabase.from('v7_scenes').select('*').eq('production_id', productionId).order('number'),
  ])

  const stageRows = (stages ?? []) as V7StageRow[]
  const sceneRows = (scenes ?? []) as V7SceneRow[]
  const timeline = buildTimeline(stageRows)

  return {
    production: production as V7ProductionRow,
    stages: stageRows,
    scenes: sceneRows,
    timeline,
  }
}

export async function replaceV7Scenes(
  supabase: SupabaseServerClient,
  productionId: string,
  scenes: Array<{ number: number; script: Record<string, unknown>; duration?: number }>
): Promise<void> {
  await supabase.from('v7_scenes').delete().eq('production_id', productionId)

  if (scenes.length === 0) return

  const { error } = await supabase.from('v7_scenes').insert(
    scenes.map((scene) => ({
      production_id: productionId,
      number: scene.number,
      script: scene.script,
      duration: scene.duration ?? null,
    }))
  )

  if (error) throw new Error(error.message)
}

export function briefToLegacyPlan(brief: V7CreativeBrief) {
  return {
    title: brief.title,
    duration: brief.duration,
    platform: brief.platform,
    language: brief.language,
    aspectRatio: brief.aspectRatio,
    style: brief.style,
    sceneCount: brief.sceneCount,
    voice: brief.voiceDirection,
    music: brief.musicDirection,
    characterConsistency: brief.characterConsistency,
    tone: brief.emotion,
    targetAudience: brief.audience,
    brand: brief.brand,
    location: brief.location,
    callToAction: brief.callToAction,
  }
}
