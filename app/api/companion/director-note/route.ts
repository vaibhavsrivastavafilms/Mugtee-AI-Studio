import { NextRequest, NextResponse } from 'next/server'
import {
  canAddDirectorNote,
  createDirectorNoteRecord,
  generateDirectorNote,
  incrementSessionCount,
  parseDirectorNotes,
  parseSessionCounts,
} from '@/lib/companion/director-engine'
import { normalizeCreativeBrief } from '@/lib/companion/creative-discovery'
import { parseJsonObject, requireCompanionUser, loadOwnedProject } from '@/lib/companion/api-helpers'
import { companionCopy } from '@/lib/companion/microcopy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireCompanionUser()
  if (auth.response) return auth.response

  const parsed = parseJsonObject(await req.json().catch(() => null))
  if (parsed.response) return parsed.response

  const body = parsed.body!
  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.trim()
      ? body.sessionId.trim().slice(0, 64)
      : 'default'
  const projectId =
    typeof body.projectId === 'string' ? body.projectId.trim() : null

  let existingNotes: ReturnType<typeof parseDirectorNotes> = []
  let sessionCounts: Record<string, number> = {}
  let brief = normalizeCreativeBrief(body.creativeBrief)

  if (projectId) {
    const { project, error } = await loadOwnedProject(
      auth.supabase,
      auth.user!.id,
      projectId
    )
    if (error) {
      return NextResponse.json({ error }, { status: error === 'Project not found' ? 404 : 500 })
    }
    existingNotes = parseDirectorNotes(project!.director_notes)
    sessionCounts = parseSessionCounts(project!.director_session_counts)
    if (!Object.keys(brief).length) {
      brief = normalizeCreativeBrief(project!.creative_brief)
    }
  }

  if (!canAddDirectorNote(sessionCounts, sessionId)) {
    return NextResponse.json({
      capReached: true,
      message: companionCopy('sessionCapReached'),
    })
  }

  const ctx = {
    hook: typeof body.hook === 'string' ? body.hook : undefined,
    script: typeof body.script === 'string' ? body.script : undefined,
    title: typeof body.title === 'string' ? body.title : undefined,
    style: typeof body.style === 'string' ? body.style : undefined,
    sceneLabel: typeof body.sceneRef === 'string' ? body.sceneRef : undefined,
    generationStep: typeof body.generationStep === 'string' ? body.generationStep : undefined,
  }

  const text = await generateDirectorNote(ctx, existingNotes, brief, true)
  const note = createDirectorNoteRecord(
    text,
    sessionId,
    typeof body.sceneRef === 'string' ? body.sceneRef : null
  )

  if (projectId) {
    const nextNotes = [...existingNotes, note]
    const nextCounts = incrementSessionCount(sessionCounts, sessionId)
    await auth.supabase
      .from('cinematic_projects')
      .update({
        director_notes: nextNotes,
        director_session_counts: nextCounts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', auth.user!.id)
  }

  return NextResponse.json({ ok: true, note })
}
