import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) process.exit(1)

const sb = createClient(url, key, { auth: { persistSession: false } })
const prodId = process.argv[2] || 'b61bd212-81f9-4b3a-bd9e-28d9ea3f410c'

const { data: prod } = await sb
  .from('v7_productions')
  .select('status,current_stage,reel_url,updated_at')
  .eq('id', prodId)
  .single()

const { data: stages } = await sb
  .from('v7_stages')
  .select('stage,status,error')
  .eq('production_id', prodId)
  .order('stage')

const { data: scenes } = await sb
  .from('v7_scenes')
  .select('number,storyboard')
  .eq('production_id', prodId)
  .order('number')

console.log(JSON.stringify({
  production: prod,
  stages: stages?.map((s) => `${s.stage}:${s.status}${s.error ? `(${s.error.slice(0, 40)})` : ''}`),
  images: scenes?.map((s) => ({
    n: s.number,
    ok: Boolean(s.storyboard?.imageUrl && (s.storyboard?.imageCheckpointAt || s.storyboard?.imageMetadata)),
  })),
}, null, 2))
