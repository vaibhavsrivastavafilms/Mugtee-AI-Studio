import 'server-only'



import { generateVoice } from '@/lib/voice/generateVoice'

import { buildV3ScriptText, v3SnapshotToGeneratedScenes } from '@/lib/v3/render-bridge.server'

import { getV3Project, updateV3Project } from '@/lib/v3/db.server'

import type { SupabaseServerClient } from '@/lib/supabase/server'

import type { ProductionPlan } from '@/types/v3/production'



export type ExecuteVoiceGenerationResult = {

  voiceUrl: string | null

  durationMs: number

  provider: string

}



export async function executeV3VoiceGeneration(params: {

  supabase: SupabaseServerClient

  projectId: string

  userId: string

}): Promise<ExecuteVoiceGenerationResult> {

  const started = Date.now()

  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)

  if (!snapshot) throw new Error('Project not found')



  const plan = snapshot.project.production_plan

  if (!plan) throw new Error('Production plan missing')



  const scenes = v3SnapshotToGeneratedScenes(snapshot)

  const scriptText = buildV3ScriptText(scenes)

  if (scriptText.length < 12) {

    throw new Error('Script narration too short for voice generation')

  }



  const voice = await generateVoice(

    {

      script: scriptText,

      userId: params.userId,

      projectId: params.projectId,

      niche: plan.style,

      tone: plan.tone ?? plan.style,

      scenes,

      preferElevenLabs: process.env.FREE_TIER_ONLY !== 'true',

    },

    params.supabase

  )



  if (!voice.audioUrl) {

    throw new Error(voice.fallbackMessage ?? 'Voice generation failed')

  }



  await updateV3Project(params.supabase, params.projectId, params.userId, {

    voice_url: voice.audioUrl,

  })



  return {

    voiceUrl: voice.audioUrl,

    durationMs: Date.now() - started,

    provider: voice.provider,

  }

}



export function resolveVoiceProfile(plan: ProductionPlan | null): string {

  return plan?.voice?.trim() || 'cinematic-narrator'

}


