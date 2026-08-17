import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })
const id = process.argv[2]
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await s.from('v7_productions').select('timeline_json,status,current_stage,prompt').eq('id', id).single()
const { data: stages } = await s.from('v7_stages').select('*').eq('production_id', id)
console.log(JSON.stringify({ production: data, stages }, null, 2))
