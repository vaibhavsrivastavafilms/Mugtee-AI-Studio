import 'server-only'



import { executeV3CaptionsGeneration } from '@/lib/v3/captions-generation.server'



export async function runCaptionsAgent(params: {

  supabase: import('@/lib/supabase/server').SupabaseServerClient

  projectId: string

  userId: string

}) {

  return executeV3CaptionsGeneration(params)

}


