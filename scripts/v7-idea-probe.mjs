/**
 * Probe V7 idea stage + provider chain without Next.js auth.
 * Usage: node scripts/v7-idea-probe.mjs
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing Supabase env')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { error: tableErr } = await supabase.from('v7_productions').select('id').limit(1)
  if (tableErr) {
    console.error('v7_productions unavailable:', tableErr.message)
    process.exit(1)
  }

  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  const userId = users?.users?.[0]?.id
  if (!userId) {
    console.error('No Supabase users found')
    process.exit(1)
  }

  const res = await fetch('http://localhost:3000/api/v7/productions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idea: 'Create a 45-second cinematic monsoon advertisement for Table Tales.',
    }),
  })

  const body = await res.json()
  console.log('HTTP', res.status)
  console.log(JSON.stringify(body, null, 2))

  if (body.productionId) {
    await supabase.from('v7_productions').delete().eq('id', body.productionId)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
