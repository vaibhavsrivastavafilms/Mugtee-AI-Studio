/**
 * Explicit V7 image regeneration — image stage only, requires passing prompt audit.
 *
 * Usage:
 *   npm run v7:regenerate-images -- 9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc
 */
import { createRequire } from 'node:module'
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

config({ path: resolve(process.cwd(), '.env.local') })

async function resolveUserId(supabase: SupabaseClient, productionId: string): Promise<string> {
  const envUserId = process.env.V7_SMOKE_USER_ID?.trim()
  if (envUserId) return envUserId

  const { data, error } = await supabase
    .from('v7_productions')
    .select('user_id')
    .eq('id', productionId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const userId = (data as { user_id?: string } | null)?.user_id
  if (!userId) throw new Error(`Production not found: ${productionId}`)
  return userId
}

async function main() {
  const productionId = process.argv[2]?.trim()
  if (!productionId) {
    console.error('Usage: npm run v7:regenerate-images -- <productionId>')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env')

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const userId = await resolveUserId(supabase, productionId)
  const { getV7Production } = await import('../lib/v7/db.server')
  const { auditV7ImagePromptsForSnapshot } = await import('../lib/v7/image-prompt-audit.server')
  const { runV7ImageOrchestrator } = await import('../lib/v7/image-scene.server')
  const { loadV7StageBibles } = await import('../lib/v7/scene-package.server')

  const snapshot = await getV7Production(supabase, productionId, userId)
  if (!snapshot) throw new Error('Production snapshot missing')

  const audit = auditV7ImagePromptsForSnapshot(snapshot)
  if (!audit.allPassed) {
    console.error('IMAGE_PROMPT_VALIDATION_FAILED — run npm run v7:image-prompt-audit first')
    process.exit(1)
  }

  const brief = snapshot.production.creative_brief
  if (!brief) throw new Error('Creative brief missing')

  const scriptStage = snapshot.stages.find((row) => row.stage === 'script')
  const storyboardStage = snapshot.stages.find((row) => row.stage === 'storyboard')
  const script = (scriptStage?.output as { script?: unknown } | null)?.script
  const storyboard = (storyboardStage?.output as { storyboard?: unknown } | null)?.storyboard
  if (!script || !storyboard) throw new Error('Script or storyboard missing')

  const bibles = loadV7StageBibles(snapshot)
  if (!bibles.direction) throw new Error('Creative direction missing')

  console.log('Regenerating images only for production', productionId)
  const result = await runV7ImageOrchestrator({
    brief,
    direction: bibles.direction,
    script: script as never,
    storyboard: storyboard as never,
    scenes: snapshot.scenes.map((scene) => ({ id: scene.id, number: scene.number })),
    productionId,
    characterBible: bibles.characterBible,
    worldBible: bibles.worldBible,
    supabase,
    forceRegenerate: true,
  })

  console.log(
    JSON.stringify(
      {
        productionId,
        regeneratedScenes: result.images.length,
        durationMs: result.durationMs,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
