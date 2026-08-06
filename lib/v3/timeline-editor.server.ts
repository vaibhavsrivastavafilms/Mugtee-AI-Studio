import 'server-only'



import { getV3Project, updateV3Project } from '@/lib/v3/db.server'

import { buildV3RenderBundle } from '@/lib/v3/render-bridge.server'

import type { SupabaseServerClient } from '@/lib/supabase/server'



export type ExecuteTimelineEditorResult = {

  clipCount: number

  totalDurationSec: number

  durationMs: number

}



export async function executeV3TimelineEditor(params: {

  supabase: SupabaseServerClient

  projectId: string

  userId: string

}): Promise<ExecuteTimelineEditorResult> {

  const started = Date.now()

  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)

  if (!snapshot) throw new Error('Project not found')



  const voiceUrl = snapshot.project.voice_url

  if (!voiceUrl) {

    throw new Error('Voice narration missing — run Voice Generation first')

  }



  const bundle = buildV3RenderBundle({

    snapshot,

    voiceUrl,

  })



  if (!bundle.timeline) {

    throw new Error('Failed to compose reel timeline')

  }



  await updateV3Project(params.supabase, params.projectId, params.userId, {

    timeline_json: bundle.timeline as unknown as Record<string, unknown>,

  })



  return {

    clipCount: bundle.timeline.clips.length,

    totalDurationSec: bundle.totalDurationSec,

    durationMs: Date.now() - started,

  }

}


