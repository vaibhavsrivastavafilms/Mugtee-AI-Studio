import { NextResponse } from 'next/server'
import { aggregateFeatureRequests } from '@/lib/admin/feature-request-aggregation'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export type CreatorInterviewRow = {
  id: string
  source: 'founding_application' | 'project_feedback'
  name: string | null
  email: string | null
  creator_type: string | null
  feedback: string | null
  requested_features: string | null
  pain_points: string | null
  rating: number | null
  created_at: string
}

export async function GET() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const db = createSupabaseServiceClient()
  if (!db) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY required for admin interviews' },
      { status: 503 }
    )
  }

  const [appsRes, feedbackRes] = await Promise.all([
    db
      .from('founding_creator_applications')
      .select(
        'id, name, email, creator_type, feedback, requested_features, pain_points, created_at, updated_at'
      )
      .order('created_at', { ascending: false })
      .limit(500),
    db
      .from('project_feedback')
      .select('id, user_id, rating, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  if (appsRes.error) return NextResponse.json({ error: appsRes.error.message }, { status: 500 })
  if (feedbackRes.error) {
    return NextResponse.json({ error: feedbackRes.error.message }, { status: 500 })
  }

  const userIds = [...new Set((feedbackRes.data || []).map((r) => r.user_id).filter(Boolean))]
  const creatorMeta: Record<string, { creator_type?: string; name?: string; email?: string }> = {}

  if (userIds.length > 0) {
    const { data: linkedApps } = await db
      .from('founding_creator_applications')
      .select('user_id, creator_type, name, email')
      .in('user_id', userIds)

    for (const app of linkedApps || []) {
      if (app.user_id) {
        creatorMeta[app.user_id] = {
          creator_type: app.creator_type,
          name: app.name,
          email: app.email,
        }
      }
    }
  }

  const interviews: CreatorInterviewRow[] = []

  for (const app of appsRes.data || []) {
    interviews.push({
      id: app.id,
      source: 'founding_application',
      name: app.name,
      email: app.email,
      creator_type: app.creator_type,
      feedback: app.feedback,
      requested_features: app.requested_features,
      pain_points: app.pain_points,
      rating: null,
      created_at: app.created_at,
    })
  }

  for (const row of feedbackRes.data || []) {
    const meta = row.user_id ? creatorMeta[row.user_id] : undefined
    interviews.push({
      id: row.id,
      source: 'project_feedback',
      name: meta?.name ?? null,
      email: meta?.email ?? null,
      creator_type: meta?.creator_type ?? null,
      feedback: row.comment,
      requested_features: null,
      pain_points: null,
      rating: row.rating,
      created_at: row.created_at,
    })
  }

  interviews.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const featureTexts = interviews.flatMap((row) =>
    [row.requested_features, row.feedback, row.pain_points].filter(
      (t): t is string => typeof t === 'string' && t.trim().length > 0
    )
  )

  return NextResponse.json({
    ok: true,
    interviews,
    most_requested_features: aggregateFeatureRequests(featureTexts),
    totals: {
      founding_applications: (appsRes.data || []).length,
      project_feedback: (feedbackRes.data || []).length,
    },
  })
}
