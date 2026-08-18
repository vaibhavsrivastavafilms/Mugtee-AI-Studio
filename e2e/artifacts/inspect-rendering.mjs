import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

loadEnvLocal()
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: productions, error } = await supabase
  .from('v7_productions')
  .select('id,title,status,current_stage,export_status,reel_url,updated_at,created_at,user_id')
  .in('status', ['producing', 'planning'])
  .order('updated_at', { ascending: false })
  .limit(10)
if (error) throw new Error(error.message)

const ids = (productions ?? []).map((p) => p.id)
let stages = []
if (ids.length) {
  const { data, error: sErr } = await supabase
    .from('v7_stages')
    .select('production_id,stage,status,error,started_at,completed_at,updated_at')
    .in('production_id', ids)
    .in('stage', ['quality', 'render', 'export', 'edit'])
  if (sErr) {
    const fallback = await supabase
      .from('v7_stages')
      .select('production_id,stage,status,error,started_at,completed_at')
      .in('production_id', ids)
      .in('stage', ['quality', 'render', 'export', 'edit'])
    if (fallback.error) throw new Error(fallback.error.message)
    stages = fallback.data ?? []
  } else {
    stages = data ?? []
  }
}

console.log(JSON.stringify({ productions, stages }, null, 2))
