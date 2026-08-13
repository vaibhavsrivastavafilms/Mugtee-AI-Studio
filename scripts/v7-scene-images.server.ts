import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const id = process.argv[2]?.trim() || 'c79ef12e-71fa-4ba9-a186-851efda10e90'
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('v7_scenes').select('number, storyboard').eq('production_id', id).order('number')
  for (const row of data ?? []) {
    const b = (row.storyboard ?? {}) as { imageUrl?: string; imageCheckpointAt?: string }
    console.log(row.number, b.imageUrl ? b.imageUrl.slice(0, 80) : 'NO_URL', b.imageCheckpointAt ?? 'NO_CP')
  }
}

main()
