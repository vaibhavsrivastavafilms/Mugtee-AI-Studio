import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import {
  clampShowcaseLimit,
  rowToShowcaseProject,
  type ShowcaseProject,
} from '@/lib/showcase/public-projects'
import type { CinematicProjectRow } from '@/lib/cinematic-projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SELECT_COLUMNS =
  'id, title, prompt, script, duration, mode, captions, scenes, storyboard, thumbnail_url, updated_at, share_as_showcase'

export async function GET(req: NextRequest) {
  const limit = clampShowcaseLimit(new URL(req.url).searchParams.get('limit'))

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json({
      ok: true,
      projects: [] as ShowcaseProject[],
      hint: 'Showcase unavailable without SUPABASE_SERVICE_ROLE_KEY',
    })
  }

  const { data, error } = await db
    .from('cinematic_projects')
    .select(SELECT_COLUMNS)
    .eq('share_as_showcase', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    const msg = `${error.message ?? ''} ${(error as { details?: string }).details ?? ''}`.toLowerCase()
    if (msg.includes('share_as_showcase') || error.code === '42703') {
      return NextResponse.json({
        ok: true,
        projects: [] as ShowcaseProject[],
        hint: 'Run supabase/migrations/0023_showcase_share.sql in Supabase SQL editor',
      })
    }
    return NextResponse.json({ ok: false, error: 'Could not load showcase' }, { status: 500 })
  }

  const projects = (data ?? []).map((row) =>
    rowToShowcaseProject(row as CinematicProjectRow)
  )

  return NextResponse.json({ ok: true, projects })
}
