import 'server-only'



import { executeV3Export, startV3ExportInBackground } from '@/lib/v3/export.server'



export async function runExportAgent(params: {

  supabase: import('@/lib/supabase/server').SupabaseServerClient

  projectId: string

  userId: string

}) {

  return executeV3Export(params)

}



export function startExportAgentBackground(params: {

  supabase: import('@/lib/supabase/server').SupabaseServerClient

  projectId: string

  userId: string

}) {

  startV3ExportInBackground(params)

}


