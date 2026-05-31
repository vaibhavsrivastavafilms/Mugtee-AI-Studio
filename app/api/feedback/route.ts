import { NextRequest, NextResponse } from 'next/server'
import {
  ExportReadinessValues,
  FeedbackTypes,
  ImprovementReasons,
  OutputRatings,
  type FeedbackType,
} from '@/lib/creator/moment-feedback'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function isFeedbackType(v: string): v is FeedbackType {
  return (FeedbackTypes as readonly string[]).includes(v)
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const feedbackTypeRaw = body.feedback_type ? String(body.feedback_type).trim() : ''

  if (feedbackTypeRaw && isFeedbackType(feedbackTypeRaw)) {
    const projectId = body.project_id ? String(body.project_id).slice(0, 36) : null
    const suggestionText = body.suggestion_text
      ? String(body.suggestion_text).trim().slice(0, 2000)
      : null

    const row: Record<string, unknown> = {
      user_id: user.id,
      project_id: projectId,
      feedback_type: feedbackTypeRaw,
      suggestion_text: suggestionText,
      feedback_text: suggestionText,
    }

    if (feedbackTypeRaw === 'output_rating') {
      const rating = String(body.rating || '').trim()
      if (!OutputRatings.includes(rating as (typeof OutputRatings)[number])) {
        return NextResponse.json({ error: 'Invalid output rating' }, { status: 400 })
      }
      row.rating = rating
      const reason = body.improvement_reason
        ? String(body.improvement_reason).trim()
        : null
      if (
        reason &&
        !ImprovementReasons.includes(reason as (typeof ImprovementReasons)[number])
      ) {
        return NextResponse.json({ error: 'Invalid improvement reason' }, { status: 400 })
      }
      if (rating === 'needs_improvement' && !reason) {
        return NextResponse.json({ error: 'Improvement reason required' }, { status: 400 })
      }
      row.improvement_reason = reason
    }

    if (feedbackTypeRaw === 'export_satisfaction') {
      const readiness = String(body.export_readiness || '').trim()
      if (
        !ExportReadinessValues.includes(readiness as (typeof ExportReadinessValues)[number])
      ) {
        return NextResponse.json({ error: 'Invalid export readiness' }, { status: 400 })
      }
      row.export_readiness = readiness
      row.rating = null
    }

    if (feedbackTypeRaw === 'suggestion') {
      if (!suggestionText) {
        return NextResponse.json({ error: 'Suggestion text required' }, { status: 400 })
      }
      row.rating = null
    }

    const { error } = await supabase.from('creator_feedback').insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const rating = Number(body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5 or provide feedback_type' }, { status: 400 })
  }

  const projectId = body.project_id ? String(body.project_id).slice(0, 36) : null
  const comment = body.comment
    ? String(body.comment).trim().slice(0, 2000)
    : body.feedback_text
      ? String(body.feedback_text).trim().slice(0, 2000)
      : null

  const { error } = await supabase.from('project_feedback').upsert(
    {
      user_id: user.id,
      project_id: projectId,
      rating,
      comment,
    },
    { onConflict: 'user_id,project_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
