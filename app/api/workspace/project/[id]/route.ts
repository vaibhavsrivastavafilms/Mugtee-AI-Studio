// Mugtee Workspace — load a single saved project for rehydration.
//
// GET /api/workspace/project/:id
//   returns: { title, description, platform, tone, duration, output }
//
// Reads from the existing `content_pieces` table, enforces user ownership, and
// gracefully tolerates older rows whose `script` column is plain text (not the
// workspace JSON envelope written by /api/workspace/save).
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMPTY_OUTPUT = { hook: '', script: '', storyboard: '', captions: '', thumbnailIdea: '' }

function safeParse(raw: any): any | null {
  if (!raw || typeof raw !== 'string') return null
  try { return JSON.parse(raw) } catch { return null }
}

function reversePlatform(p?: string | null): string {
  // /save maps instagram_reel → 'instagram', youtube_short/video → 'youtube'.
  // For rehydration we prefer the original workspace key when available; otherwise
  // pick a sensible default so the dropdown stays valid.
  if (!p) return 'instagram_reel'
  if (p === 'youtube') return 'youtube_short'
  if (p === 'instagram') return 'instagram_reel'
  return p
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const { data, error } = await supabase
      .from('content_pieces')
      .select('id, user_id, title, description, platform, script, status, created_at, updated_at')
      .eq('id', params.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    if (data.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsed = safeParse(data.script)
    const isWorkspaceRow = parsed && parsed.workspace === true

    // Workspace-saved rows have the structured envelope; legacy rows just have raw text in `script`.
    const prompt = isWorkspaceRow ? parsed.prompt || {} : {}
    const output = isWorkspaceRow
      ? { ...EMPTY_OUTPUT, ...(parsed.output || {}) }
      : { ...EMPTY_OUTPUT, script: typeof data.script === 'string' ? data.script : '' }

    return NextResponse.json({
      id: data.id,
      title: data.title || 'Untitled project',
      description: prompt.topic || data.description || data.title || '',
      platform: reversePlatform(prompt.platform || data.platform),
      tone: prompt.tone || 'cinematic',
      duration: String(prompt.duration || 60),
      output,
      updated_at: data.updated_at || data.created_at,
    })
  } catch (e: any) {
    console.error('workspace project load error', e)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
