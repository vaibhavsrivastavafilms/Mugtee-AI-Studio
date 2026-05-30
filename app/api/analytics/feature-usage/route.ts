import { NextRequest, NextResponse } from 'next/server'
import {
  isFeatureUsageFeature,
  trackFeatureUsage,
  type FeatureUsageFeature,
} from '@/lib/analytics/feature-usage'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Authenticated fire-and-forget feature usage insert (client export paths). */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const feature = String(body.feature || '').trim()
    if (!isFeatureUsageFeature(feature)) {
      return NextResponse.json({ error: 'invalid feature' }, { status: 400 })
    }

    const projectId =
      typeof body.project_id === 'string'
        ? body.project_id.trim()
        : typeof body.projectId === 'string'
          ? body.projectId.trim()
          : null

    void trackFeatureUsage(user.id, feature as FeatureUsageFeature, projectId || undefined)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
