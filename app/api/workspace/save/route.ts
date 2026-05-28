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
import {
  OUTPUT_FIELDS, LIMITS,
  coerceTopic, coercePlatform, coerceTone, coerceDuration,
  normalizeOutput, logError, EMPTY_OUTPUT,
} from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mapPlatform(p?: string): string {
  if (!p) return 'instagram'
  if (p.startsWith('youtube')) return 'youtube'
  if (p.startsWith('instagram')) return 'instagram'
  return 'instagram'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    // Defensive parse — null body / malformed JSON / wrong root type.
    const raw = (await req.json().catch(() => null)) as any
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
    }

    const topic = coerceTopic(raw.topic)
    if (!topic) return NextResponse.json({ error: 'Missing topic' }, { status: 400 })

    if (!raw.output || typeof raw.output !== 'object' || Array.isArray(raw.output)) {
      return NextResponse.json({ error: 'Missing or invalid output object' }, { status: 400 })
    }

    // Hard requirement: at least ONE of the 5 fields must be a non-empty string.
    // Prevents accidental empty saves from corrupting the recents list.
    const hasContent = OUTPUT_FIELDS.some(k => typeof raw.output[k] === 'string' && raw.output[k].trim().length > 0)
    if (!hasContent) {
      return NextResponse.json({ error: 'Output is empty — generate first.' }, { status: 400 })
    }

    const platformWorkspace = coercePlatform(raw.platform)
    const tone     = coerceTone(raw.tone)
    const duration = coerceDuration(raw.duration)
    const output   = normalizeOutput(raw.output, EMPTY_OUTPUT)

    // Phase 3I — auto-map pipeline status from the output that's actually
    // present on first save. Mugtee's /api/generate-script returns hook +
    // script + storyboard in a single shot, so most creators land on
    // 'shooting' here. The /api/ai/image route promotes to 'editing' later
    // when frames are generated. Uses the same vocabulary the kanban
    // pipeline already filters on (idea / scripting / shooting / editing /
    // scheduled / published).
    const hasStoryboard =
    JSON.stringify(output.storyboard || []).length > 20
    const hasScript     = (output.script     || '').trim().length > 20
    const derivedStatus = hasStoryboard ? 'shooting' : hasScript ? 'scripting' : 'idea'

    const payload = {
      user_id: user.id,
      title: topic.slice(0, LIMITS.title),
      platform: mapPlatform(platformWorkspace),
      status: derivedStatus,
      description: topic,
      script: JSON.stringify({
        workspace: true,
        prompt: { topic, platform: platformWorkspace, tone, duration },
        output,
      }),
    }

    const { data, error } = await supabase
      .from('content_pieces')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      logError('workspace.save.db', error, { code: (error as any).code })
      return NextResponse.json({ error: 'Could not save project' }, { status: 500 })
    }
    if (!data?.id) {
      logError('workspace.save.no-id', null)
      return NextResponse.json({ error: 'Save returned no id' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (e: any) {
    logError('workspace.save.exception', e)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
