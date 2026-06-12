import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const FORBIDDEN = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
const NOT_FOUND = NextResponse.json({ error: 'Project not found' }, { status: 404 })

/** Verify the authenticated user owns the project (content_pieces or cinematic_projects). */
export async function requireProjectOwner(
  userId: string,
  projectId: string | null | undefined
): Promise<NextResponse | null> {
  const id = projectId?.trim()
  if (!id) return null

  const supabase = createSupabaseServerClient()

  const { data: piece } = await supabase
    .from('content_pieces')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()

  if (piece) {
    return piece.user_id === userId ? null : FORBIDDEN
  }

  const { data: cinematic } = await supabase
    .from('cinematic_projects')
    .select('user_id')
    .eq('id', id)
    .maybeSingle()

  if (cinematic) {
    return cinematic.user_id === userId ? null : FORBIDDEN
  }

  return NOT_FOUND
}
