import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { verifyDirectorProject } from '@/lib/director/director-db.server'
import { recordSuggestionFeedback } from '@/lib/director/producer/producer-memory'
import {
  loadProducerReport,
  updateProducerReportMemory,
  upsertCreatorProducerMemory,
} from '@/lib/director/producer/producer-db.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const reportId = String(parsed.body!.reportId || '').trim()
    const suggestionId = String(parsed.body!.suggestionId || '').trim()
    const accepted = Boolean(parsed.body!.accepted)

    if (!reportId || !suggestionId) {
      return NextResponse.json({ error: 'reportId and suggestionId required' }, { status: 400 })
    }

    const userId = auth.user!.id
    const supabase = await import('@/lib/supabase/server').then((m) => m.createSupabaseServerClient())
    const { data: row } = await supabase
      .from('producer_reports')
      .select('project_id, producer_memory')
      .eq('id', reportId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const project = await verifyDirectorProject(String(row.project_id), userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { parseProducerMemory } = await import('@/lib/director/producer/producer-memory')
    const currentMemory = parseProducerMemory(row.producer_memory)
    const updatedMemory = recordSuggestionFeedback(currentMemory, suggestionId, accepted)

    const { error: updateError } = await updateProducerReportMemory(reportId, userId, updatedMemory)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await upsertCreatorProducerMemory(userId, updatedMemory)

    const report = await loadProducerReport(String(row.project_id), userId)

    return NextResponse.json({
      producerMemory: updatedMemory,
      report,
    })
  } catch (err) {
    logError('director.producer.feedback', err)
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
  }
}
