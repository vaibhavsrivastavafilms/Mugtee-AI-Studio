import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { upsertProducerReport } from '@/lib/director/producer/producer-db.server'
import type { ProducerReport } from '@/lib/director/producer/types'
import { computeCreativeAlignmentScore } from '@/lib/creative-team/alignment-score'
import { CREATIVE_TEAM_AGENT_IDS, DEFAULT_AGENT_STATES } from '@/lib/creative-team/types'
import type { CreativeTeamAgentId } from '@/lib/creative-team/types'
import {
  loadCreativeTeamReport,
  upsertCreativeTeamReport,
} from '@/lib/creative-team/creative-team-db.server'
import { runCreativeTeamOrchestrator } from '@/lib/creative-team/orchestrator'
import {
  assertDirectorProject,
  resolveCreativeTeamContext,
} from '@/lib/creative-team/resolve-context.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    const agentId = parsed.body!.agentId as CreativeTeamAgentId | undefined

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }
    if (agentId && !CREATIVE_TEAM_AGENT_IDS.includes(agentId)) {
      return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 })
    }

    const userId = auth.user!.id
    const project = await assertDirectorProject(projectId, userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const ctx = await resolveCreativeTeamContext(projectId, userId)
    if (!ctx) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const existing = await loadCreativeTeamReport(projectId, userId)
    const existingReports = existing
      ? {
          'story-strategist': existing.storyStrategy ?? undefined,
          'executive-producer': existing.producerReport ?? undefined,
          screenwriter: existing.screenwriterReport ?? undefined,
          cinematographer: existing.cinematographyReport ?? undefined,
          'voice-director': existing.voiceReport ?? undefined,
          'music-director': existing.musicReport ?? undefined,
        }
      : undefined

    const agentStates = { ...(existing?.agentStates ?? DEFAULT_AGENT_STATES) }
    if (agentId) agentStates[agentId] = 'running'

    const result = await runCreativeTeamOrchestrator(ctx, {
      agentId,
      agentStates,
      existingReports,
    })

    if (result.reports['executive-producer']?.payload) {
      const producerPayload = result.reports['executive-producer'].payload as ProducerReport
      await upsertProducerReport(projectId, userId, producerPayload)
    }

    const { data: saved, error } = await upsertCreativeTeamReport(projectId, userId, {
      reportId: existing?.reportId,
      ...result.package,
      alignmentScore:
        result.package.alignmentScore ??
        computeCreativeAlignmentScore(result.package),
    })

    if (error || !saved) {
      return NextResponse.json({ error: error?.message || 'Failed to save report' }, { status: 500 })
    }

    return NextResponse.json({
      package: saved,
      alignmentScore: saved.alignmentScore,
    })
  } catch (err) {
    logError('director.creative-team.run', err)
    return NextResponse.json({ error: 'Creative team run failed' }, { status: 500 })
  }
}
