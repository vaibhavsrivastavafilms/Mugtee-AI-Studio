import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env.local') })

async function main() {
  const id = process.argv[2]?.trim() || '9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc'
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: production } = await s
    .from('v7_productions')
    .select('status,current_stage,reel_url,music_url,voice_url,export_status,title')
    .eq('id', id)
    .single()
  const { data: stages } = await s.from('v7_stages').select('stage,status').eq('production_id', id)
  const { data: scenes } = await s
    .from('v7_scenes')
    .select('number,storyboard')
    .eq('production_id', id)
    .order('number')

  console.log(
    JSON.stringify(
      {
        production,
        stages,
        sceneVideos: scenes?.map((sc) => {
          const board = (sc.storyboard ?? {}) as { videoUrl?: string }
          return {
            scene: sc.number,
            hasVideo: Boolean(board.videoUrl?.trim()),
            videoUrl: board.videoUrl ?? null,
          }
        }),
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
