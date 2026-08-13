/**
 * READ-ONLY screenplay diagnostic — does NOT call OpenRouter or Pollinations.
 *
 * Usage:
 *   npm run v7:screenplay-diagnostic -- <productionId>
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

import { validateScreenplayDocument } from '@/agents/v7/script-schema'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const productionId = process.argv[2]?.trim()
  if (!productionId) {
    console.error('Usage: npm run v7:screenplay-diagnostic -- <productionId>')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: production, error: productionError } = await supabase
    .from('v7_productions')
    .select('id,title,status,current_stage')
    .eq('id', productionId)
    .maybeSingle()

  if (productionError || !production) {
    console.error('Production not found:', productionError?.message ?? productionId)
    process.exit(1)
  }

  const { data: scriptStage } = await supabase
    .from('v7_stages')
    .select('status,output,error')
    .eq('production_id', productionId)
    .eq('stage', 'script')
    .maybeSingle()

  const scriptOutput = (scriptStage?.output ?? {}) as Record<string, unknown>
  const screenplay = scriptOutput.script ?? null
  const screenplayExists = Boolean(screenplay && typeof screenplay === 'object')

  let schemaStatus: 'PASS' | 'FAIL' | 'N/A' = 'N/A'
  let invalidFields: string[] = []

  if (screenplayExists) {
    const validation = validateScreenplayDocument(screenplay)
    if (validation.ok) {
      schemaStatus = 'PASS'
    } else {
      schemaStatus = 'FAIL'
      invalidFields = validation.errors
    }
  }

  console.log('SCREENPLAY DIAGNOSTIC')
  console.log('')
  console.log(`Production:\n${productionId}`)
  console.log('')
  console.log(`Screenplay exists:\n${screenplayExists ? 'YES' : 'NO'}`)
  console.log('')
  console.log(`Schema:\n${schemaStatus}`)
  console.log('')
  console.log('Invalid fields:')
  if (invalidFields.length === 0) {
    console.log('...')
  } else {
    for (const field of invalidFields) {
      console.log(field)
    }
  }
  console.log('')
  console.log('OpenRouter:\nNOT CALLED')
  console.log('')
  console.log('Pollinations:\nNOT CALLED')
  console.log('')
  console.log('Pollen spent:\n0')
  console.log('')
  console.log('Stage status:', scriptStage?.status ?? 'missing')
  console.log('Production status:', production.status)
  console.log('Current stage:', production.current_stage)
  if (scriptStage?.error) {
    console.log('Stage error:', scriptStage.error)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
