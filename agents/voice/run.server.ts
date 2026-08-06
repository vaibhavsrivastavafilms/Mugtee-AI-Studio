import 'server-only'



import { executeV3VoiceGeneration } from '@/lib/v3/voice-generation.server'



export type VoiceAgentParams = {

  projectId: string

  userId: string

  supabase: import('@/lib/supabase/server').SupabaseServerClient

}



export type VoiceAgentResult = {

  voiceUrl: string | null

  durationMs: number

  provider: string

}



export async function runVoiceAgent(params: VoiceAgentParams): Promise<VoiceAgentResult> {

  return executeV3VoiceGeneration(params)

}


