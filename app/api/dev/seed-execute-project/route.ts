import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  SMOKE_HOOK,
  SMOKE_PROMPT,
  SMOKE_SCRIPT,
  makeSmokeScenes,
} from '@/lib/ci/smoke-fixtures'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Dev-only — fresh cinematic project for execute scripts (owner RLS). */
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available outside development' }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.response) return auth.response

  const projectId = randomUUID()
  const now = new Date().toISOString()
  const scenes = makeSmokeScenes()
  const supabase = createSupabaseServerClient()

  const { error: cinematicErr } = await supabase.from('cinematic_projects').insert({
    id: projectId,
    user_id: auth.user!.id,
    title: 'Execute Mode Quick Cut',
    prompt: SMOKE_PROMPT,
    script: SMOKE_SCRIPT,
    style: 'cinematic',
    duration: 4,
    status: 'reviewing',
    mode: 'quick',
    scenes,
    storyboard: scenes,
    captions: {
      hook: SMOKE_HOOK,
      summary: SMOKE_HOOK,
      text: '',
      suggestedVoiceStyle: 'warm_documentary',
      niche: 'storytelling',
    },
    generation_status: 'running',
    generation_step: 'script',
    updated_at: now,
    created_at: now,
  })
  if (cinematicErr) {
    return NextResponse.json({ error: cinematicErr.message }, { status: 500 })
  }

  await supabase.from('content_pieces').insert({
    id: projectId,
    user_id: auth.user!.id,
    title: 'Execute Mode Quick Cut',
    description: SMOKE_PROMPT,
    platform: 'instagram',
    script: JSON.stringify({
      hook: SMOKE_HOOK,
      script: SMOKE_SCRIPT,
      storyboard: scenes,
      captions: '',
      thumbnailIdea: '',
    }),
    status: 'shooting',
    updated_at: now,
    created_at: now,
  })

  console.info(
    '[PROJECT_CREATED]',
    JSON.stringify({
      projectId,
      template: 'creator_story',
      timestamp: now,
    })
  )

  return NextResponse.json({
    projectId,
    template: 'creator_story',
    timestamp: now,
    scenes,
    hook: SMOKE_HOOK,
    script: SMOKE_SCRIPT,
    prompt: SMOKE_PROMPT,
  })
}
