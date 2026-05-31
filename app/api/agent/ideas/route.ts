import { NextRequest, NextResponse } from 'next/server'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'
import { ideaToProjectPrompt, parseIdeaCapture } from '@/lib/agent/idea-capture'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const rawText = typeof parsed.body!.text === 'string' ? parsed.body!.text.trim() : ''
  if (!rawText || rawText.length < 6) {
    return NextResponse.json({ error: 'text required (min 6 chars)' }, { status: 400 })
  }

  const parsedIdea = parseIdeaCapture(rawText)
  const projectPrompt = ideaToProjectPrompt(parsedIdea, rawText)

  const { data, error } = await auth.supabase
    .from('creator_ideas')
    .insert({
      user_id: auth.user!.id,
      raw_text: rawText,
      parsed: parsedIdea,
      status: 'captured',
    })
    .select('id, raw_text, parsed, status, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    idea: data,
    projectPrompt,
  })
}

export async function GET() {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const { data } = await auth.supabase
    .from('creator_ideas')
    .select('id, raw_text, parsed, status, created_at')
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ ok: true, ideas: data ?? [] })
}
