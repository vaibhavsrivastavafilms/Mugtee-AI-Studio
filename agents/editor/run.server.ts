import 'server-only'



import { executeV3TimelineEditor } from '@/lib/v3/timeline-editor.server'



export async function runEditorAgent(params: {

  supabase: import('@/lib/supabase/server').SupabaseServerClient

  projectId: string

  userId: string

}) {

  return executeV3TimelineEditor(params)

}


