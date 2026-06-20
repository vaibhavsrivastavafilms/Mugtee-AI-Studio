// Mugtee Workspace — load a single saved project for rehydration.
//
// GET /api/workspace/project/:id
//   returns: { id, title, description, platform, tone, duration, output, updated_at }
//
// Reads from the existing `content_pieces` table, enforces user ownership, and
// gracefully tolerates older rows whose `script` column is plain text (not the
// workspace JSON envelope written by /api/workspace/save).
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  isUuid, normalizeOutput, logError, EMPTY_OUTPUT,
  coercePlatform, coerceTone, coerceDuration,
} from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeParse(raw: any): any | null {
  if (typeof raw !== 'string') return null
  try { return JSON.parse(raw) } catch { return null }
}

function reversePlatform(p?: string | null): 'instagram_reel' | 'youtube_short' | 'youtube_video' {
  if (!p) return 'instagram_reel'
  if (p === 'youtube' || p === 'youtube_short') return 'youtube_short'
  if (p === 'youtube_video') return 'youtube_video'
  if (p === 'instagram' || p === 'instagram_reel') return 'instagram_reel'
  return 'instagram_reel'
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    // Fail fast on malformed UUID — prevents Supabase from throwing 22P02.
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Invalid project id' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const { data, error } = await supabase
      .from('content_pieces')
      .select('id, user_id, title, description, platform, script, status, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logError('workspace.project.db', error, { code: (error as any).code, id })
      return NextResponse.json({ error: 'Could not load project' }, { status: 500 })
    }
    if (!data) {
      const { data: cinematic, error: cinematicErr } = await supabase
        .from('cinematic_projects')
        .select('id, user_id, title, prompt, script, platform, tone, duration, updated_at, created_at')
        .eq('id', id)
        .maybeSingle()

      if (cinematicErr) {
        logError('workspace.project.cinematic.db', cinematicErr, { id })
      }

      if (cinematic && cinematic.user_id === user.id) {
        const scriptText =
          typeof cinematic.script === 'string' ? cinematic.script.trim() : ''
        return NextResponse.json({
          id: cinematic.id,
          title: cinematic.title || 'Untitled project',
          description: cinematic.prompt || cinematic.title || '',
          platform: reversePlatform(cinematic.platform),
          tone: coerceTone(cinematic.tone),
          duration: String(coerceDuration(cinematic.duration)),
          output: normalizeOutput(
            { hook: '', script: scriptText, storyboard: '', captions: '', thumbnailIdea: '' },
            EMPTY_OUTPUT
          ),
          updated_at: cinematic.updated_at || cinematic.created_at,
          legacy: false,
          source: 'cinematic',
        })
      }

      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (data.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsed = safeParse(data.script)
    const isWorkspaceRow = !!(parsed && typeof parsed === 'object' && parsed.workspace === true)

    // Workspace-saved rows have the structured envelope; legacy rows just have raw text in `script`.
    const prompt = isWorkspaceRow && parsed.prompt && typeof parsed.prompt === 'object' ? parsed.prompt : {}
    const legacyScriptText = !isWorkspaceRow && typeof data.script === 'string' ? data.script : ''

    const rawOutput = isWorkspaceRow ? parsed.output : { ...EMPTY_OUTPUT, script: legacyScriptText }
    const output = normalizeOutput(rawOutput, EMPTY_OUTPUT)

    return NextResponse.json({
      id: data.id,
      title: data.title || 'Untitled project',
      description: prompt.topic || data.description || data.title || '',
      platform: reversePlatform(prompt.platform || data.platform),
      tone: coerceTone(prompt.tone),
      duration: String(coerceDuration(prompt.duration)),
      output,
      updated_at: data.updated_at || data.created_at,
      legacy: !isWorkspaceRow,
    })
  } catch (e: any) {
    logError('workspace.project.exception', e, { id })
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
