import 'server-only'

import type { SupabaseServerClient } from '@/lib/supabase/server'
import type { V7ProductionSnapshot } from '@/types/v7/production'

/** Mirror completed V7 production into cinematic_projects for dashboard/library. */
export async function syncV7ProductionToCinematicProject(params: {
  supabase: SupabaseServerClient
  snapshot: V7ProductionSnapshot
}): Promise<void> {
  const { production, scenes } = params.snapshot
  if (production.status !== 'completed' || !production.reel_url?.trim()) return

  const brief = production.creative_brief
  const sceneRows = scenes.map((scene) => {
    const script = scene.script as Record<string, unknown>
    const board = scene.storyboard as Record<string, unknown>
    return {
      id: scene.id,
      title: script.title ?? `Scene ${scene.number}`,
      narration: script.narration ?? '',
      imageUrl: board.imageUrl ?? null,
      duration: scene.duration,
    }
  })

  const row = {
    id: production.id,
    user_id: production.user_id,
    title: production.title,
    prompt: production.prompt,
    style: brief?.style ?? 'cinematic',
    duration: brief?.duration ?? 60,
    script: sceneRows.map((s) => s.narration).filter(Boolean).join('\n\n'),
    scenes: sceneRows,
    status: 'complete',
    video_url: production.reel_url,
    reel_url: production.reel_url,
    thumbnail_url: production.thumbnail_url,
    reel_status: 'completed',
    reel_rendered_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await params.supabase
    .from('cinematic_projects')
    .select('id')
    .eq('id', production.id)
    .eq('user_id', production.user_id)
    .maybeSingle()

  if (existing?.id) {
    await params.supabase
      .from('cinematic_projects')
      .update(row)
      .eq('id', production.id)
      .eq('user_id', production.user_id)
  } else {
    await params.supabase.from('cinematic_projects').insert({
      ...row,
      created_at: production.created_at,
    })
  }
}
