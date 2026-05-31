import { NextRequest, NextResponse } from 'next/server'
import { normalizeCreativeBrief } from '@/lib/companion/creative-discovery'
import { parseJsonObject, requireCompanionUser } from '@/lib/companion/api-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const brief = normalizeCreativeBrief(parsed.body!.creativeBrief ?? parsed.body!.creative_brief)
  const projectId =
    typeof parsed.body!.projectId === 'string' ? parsed.body!.projectId.trim() : null

  if (projectId) {
    const { error } = await auth.supabase
      .from('cinematic_projects')
      .update({
        creative_brief: { ...brief, completedAt: brief.completedAt ?? new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', auth.user!.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    creativeBrief: { ...brief, completedAt: brief.completedAt ?? new Date().toISOString() },
  })
}
