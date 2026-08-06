import 'server-only'



import { buildExportCaptionTracks } from '@/lib/remotion/build-export-captions'

import { getV3Project, updateV3Project } from '@/lib/v3/db.server'

import { buildV3ScriptText, v3SnapshotToGeneratedScenes } from '@/lib/v3/render-bridge.server'

import type { SupabaseServerClient } from '@/lib/supabase/server'



export type ExecuteCaptionsGenerationResult = {

  captionCount: number

  durationMs: number

}



export async function executeV3CaptionsGeneration(params: {

  supabase: SupabaseServerClient

  projectId: string

  userId: string

}): Promise<ExecuteCaptionsGenerationResult> {

  const started = Date.now()

  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)

  if (!snapshot) throw new Error('Project not found')



  const plan = snapshot.project.production_plan

  const scenes = v3SnapshotToGeneratedScenes(snapshot)

  const totalDurationSec =

    plan?.duration ?? scenes.reduce((sum, scene) => sum + (scene.duration ?? 0), 0)



  const { tracks } = buildExportCaptionTracks({

    scenes,

    totalDurationSec,

    fallbackText: buildV3ScriptText(scenes),

    title: plan?.title ?? snapshot.project.title,

  })



  await updateV3Project(params.supabase, params.projectId, params.userId, {

    captions_json: tracks,

  })



  return {

    captionCount: tracks.length,

    durationMs: Date.now() - started,

  }

}


