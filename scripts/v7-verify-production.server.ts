/**
 * Read-only production asset verification.
 * Usage: npx tsx scripts/v7-verify-production.server.ts <productionId>
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

const productionId = process.argv[2]?.trim()
if (!productionId) {
  console.error('Usage: npx tsx scripts/v7-verify-production.server.ts <productionId>')
  process.exit(1)
}

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
  const { data: prod, error: prodErr } = await supabase
    .from('v7_productions')
    .select('status,current_stage,voice_url,music_url,reel_url,timeline_json')
    .eq('id', productionId)
    .single()

  if (prodErr || !prod) throw new Error(prodErr?.message ?? 'Production not found')

  const { data: stages } = await supabase
    .from('v7_stages')
    .select('stage,status,error')
    .eq('production_id', productionId)

  const { data: scenes } = await supabase
    .from('v7_scenes')
    .select('id,number,storyboard')
    .eq('production_id', productionId)
    .order('number')

  const { data: voiceAssets } = await supabase
    .from('project_assets')
    .select('kind,storage_path,mime_type,created_at')
    .eq('project_id', productionId)
    .eq('kind', 'voiceover')
    .order('created_at', { ascending: false })
    .limit(1)

  const sceneVideos = (scenes ?? []).map((scene) => {
    const board = (scene.storyboard ?? {}) as { videoUrl?: string | null }
    return {
      sceneNumber: scene.number,
      videoPresent: Boolean(board.videoUrl?.trim()),
    }
  })

  const videoCount = sceneVideos.filter((s) => s.videoPresent).length
  const renderStage = stages?.find((s) => s.stage === 'render')
  const editStage = stages?.find((s) => s.stage === 'edit')

  console.log(
    JSON.stringify(
      {
        productionId,
        status: prod.status,
        currentStage: prod.current_stage,
        voiceover: {
          exists: Boolean(prod.voice_url?.trim()),
          storagePath: voiceAssets?.[0]?.storage_path ?? null,
        },
        music: { exists: Boolean(prod.music_url?.trim()) },
        editing: { exists: editStage?.status === 'completed' },
        sceneVideos: { count: videoCount, total: scenes?.length ?? 0 },
        render: { status: renderStage?.status ?? 'missing', error: renderStage?.error ?? null },
        reelUrlPresent: Boolean(prod.reel_url?.trim()),
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
