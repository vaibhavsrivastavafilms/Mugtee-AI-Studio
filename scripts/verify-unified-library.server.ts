/**
 * Verify unified project library aggregation counts.
 *
 * Usage:
 *   npx tsx scripts/verify-unified-library.server.ts [userId]
 */
import { createRequire } from 'node:module'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let userId = process.argv[2]?.trim() || process.env.V7_SMOKE_USER_ID?.trim()
  if (!userId) {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    userId = data.users[0]?.id
  }
  if (!userId) throw new Error('No user id')

  const { fetchUnifiedProjectLibrary } = await import('../lib/projects/unified-library.server')
  const payload = await fetchUnifiedProjectLibrary({
    supabase,
    userId,
    page: 1,
    pageSize: 100,
  })

  console.log('PROJECT SOURCES FOUND:')
  console.log(`- v7: ${payload.sources.v7}`)
  console.log(`- cinematic/quick cut: ${payload.sources.cinematic}`)
  console.log(`- v3: ${payload.sources.v3}`)
  if (payload.sources.errors.length) {
    console.log('SOURCE ERRORS:')
    for (const err of payload.sources.errors) console.log(`- ${err}`)
  }

  console.log('\nTOTAL PROJECTS:', payload.stats.total)
  console.log('V7:', payload.stats.v7)
  console.log('QUICK CUT:', payload.stats.quickCut)
  console.log('CINEMATIC:', payload.stats.cinematic)
  console.log('V3 / LEGACY:', payload.stats.v3)
  console.log('COMPLETED:', payload.stats.completed)
  console.log('RUNNING:', payload.stats.running)
  console.log('PAUSED:', payload.stats.paused)
  console.log('FAILED:', payload.stats.failed)

  const target = 'c79ef12e-71fa-4ba9-a186-851efda10e90'
  const { data: targetRow } = await supabase
    .from('v7_productions')
    .select('id,user_id,title,status')
    .eq('id', target)
    .maybeSingle()

  if (targetRow?.user_id) {
    const ownerPayload = await fetchUnifiedProjectLibrary({
      supabase,
      userId: targetRow.user_id as string,
      page: 1,
      pageSize: 100,
    })
    const found = ownerPayload.projects.find((row) => row.id === target)
    console.log('\nPAUSED PRODUCTION DISCOVERABLE:', found ? 'YES' : 'NO', target)
    if (found) {
      console.log(
        JSON.stringify(
          { title: found.title, status: found.status, route: found.route, progress: found.progress },
          null,
          2
        )
      )
    }
  } else {
    console.log('\nPAUSED PRODUCTION DISCOVERABLE: NOT IN DATABASE', target)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
