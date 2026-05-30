import { NextResponse } from 'next/server'
import {
  AnalyticsEvents,
  FeedbackRatings,
  type FeedbackRating,
} from '@/lib/analytics/events'
import { buildTrustAggregates, computeTrustScore } from '@/lib/analytics/trust-score'
import { trustInputsFromEvents } from '@/lib/analytics/compute-metrics'
import { buildAnalyticsEventRow } from '@/lib/analytics/track-event'
import { insertAnalyticsEventRow } from '@/lib/analytics/track-server-event'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const rating = String(body?.rating || '').trim().toLowerCase() as FeedbackRating
    if (!FeedbackRatings.includes(rating)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const projectId = body?.project_id ? String(body.project_id).slice(0, 36) : null
    const feedbackText = body?.feedback_text
      ? String(body.feedback_text).trim().slice(0, 2000)
      : null

    const { error: insertErr } = await supabase.from('creator_feedback').insert({
      user_id: user.id,
      project_id: projectId,
      rating,
      feedback_text: feedbackText,
    })
    if (insertErr) return NextResponse.json({ ok: true, saved: false })

    await insertAnalyticsEventRow(
      buildAnalyticsEventRow({
        event: AnalyticsEvents.FEEDBACK_SUBMITTED,
        userId: user.id,
        metadata: {
          projectId,
          rating,
          has_text: Boolean(feedbackText),
        },
      })
    )

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: userEvents } = await supabase
      .from('analytics_events')
      .select('event, metadata, created_at, user_id, session_id')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .limit(2000)

    const { data: userFeedback } = await supabase
      .from('creator_feedback')
      .select('rating')
      .eq('user_id', user.id)
      .limit(50)

    const ratings = (userFeedback || [])
      .map((f) => f.rating as FeedbackRating)
      .filter((r) => FeedbackRatings.includes(r))

    const trustInputs = trustInputsFromEvents(
      (userEvents || []).map((e) => ({
        event: e.event,
        user_id: e.user_id,
        session_id: e.session_id,
        metadata: e.metadata as Record<string, unknown>,
        created_at: e.created_at,
      })),
      ratings
    )
    const trustScore = computeTrustScore(trustInputs)
    const aggregates = buildTrustAggregates(trustInputs, trustScore)

    await supabase.from('creator_metrics').upsert({
      user_id: user.id,
      trust_score: trustScore,
      aggregates,
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, trust_score: trustScore })
  } catch {
    return NextResponse.json({ ok: true, saved: false })
  }
}
