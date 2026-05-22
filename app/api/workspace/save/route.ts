// Mugtee Workspace — save a generated reel into the existing content_pieces table.
//
// POST /api/workspace/save
//   body: { topic, platform, tone, duration, output: { hook, script, storyboard, captions, thumbnailIdea } }
//   returns: { id }
//
// Reuses the existing `public.content_pieces` schema so the project shows up in the
// dashboard's recent-projects view automatically — no new migration required.
//   • title       = first 80 chars of topic
//   • platform    = mapped to existing platform vocabulary (instagram / youtube)
//   • description = original prompt
//   • script      = JSON-stringified full output (hook/script/storyboard/captions/thumbnailIdea)
//   • status      = 'draft'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mapPlatform(p?: string): string {
  if (!p) return 'instagram'
  if (p.startsWith('youtube')) return 'youtube'
  if (p.startsWith('instagram')) return 'instagram'
  return p
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as any
    const topic = (body?.topic || '').trim()
    if (!topic) return NextResponse.json({ error: 'Missing topic' }, { status: 400 })
    if (!body?.output || typeof body.output !== 'object') {
      return NextResponse.json({ error: 'Missing output' }, { status: 400 })
    }

    const payload = {
      user_id: user.id,
      title: topic.slice(0, 80),
      platform: mapPlatform(body.platform),
      status: 'draft',
      description: topic,
      script: JSON.stringify({
        workspace: true,
        prompt: { topic, platform: body.platform, tone: body.tone, duration: body.duration },
        output: body.output,
      }),
    }

    const { data, error } = await supabase
      .from('content_pieces')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      console.error('workspace save error', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data?.id })
  } catch (e: any) {
    console.error('workspace save exception', e)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
