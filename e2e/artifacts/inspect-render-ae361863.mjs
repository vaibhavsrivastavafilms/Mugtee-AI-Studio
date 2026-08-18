import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from '../../scripts/ci/auth-session.mjs'

const ID = 'ae361863-8ba1-41c4-b7b3-0ca2503dfeb3'
loadEnvLocal()
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: production, error: pErr } = await supabase
  .from('v7_productions')
  .select('id,title,status,current_stage,export_status,reel_url,thumbnail_url,updated_at,timeline_json')
  .eq('id', ID)
  .maybeSingle()
if (pErr) throw new Error(pErr.message)

const { data: stages, error: sErr } = await supabase
  .from('v7_stages')
  .select('stage,status,error,started_at,completed_at,output')
  .eq('production_id', ID)
if (sErr) throw new Error(sErr.message)

const timeline = production?.timeline_json && typeof production.timeline_json === 'object' ? production.timeline_json : {}
const render = (stages ?? []).find((row) => row.stage === 'render')
const started = render?.started_at ? Date.parse(render.started_at) : null
const elapsedSec = started ? Math.round((Date.now() - started) / 1000) : null

console.log(JSON.stringify({
  observedAt: new Date().toISOString(),
  elapsedSec,
  production: {
    id: production.id,
    title: production.title,
    status: production.status,
    current_stage: production.current_stage,
    export_status: production.export_status,
    reel_url: production.reel_url,
    thumbnail_url: production.thumbnail_url,
    updated_at: production.updated_at,
    pipeline_lock: timeline.pipeline_lock ?? null,
  },
  stages: (stages ?? []).map((row) => ({
    stage: row.stage,
    status: row.status,
    error: row.error,
    started_at: row.started_at,
    completed_at: row.completed_at,
    output_keys: row.output && typeof row.output === 'object' ? Object.keys(row.output) : [],
    output_preview: row.stage === 'render' ? row.output : undefined,
  })),
}, null, 2))
