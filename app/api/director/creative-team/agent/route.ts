import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { upsertProducerReport } from '@/lib/director/producer/producer-db.server'
import type { ProducerReport } from '@/lib/director/producer/types'
import { computeCreativeAlignmentScore } from '@/lib/creative-team/alignment-score'
import { getCreativeTeamAgent } from '@/lib/creative-team/agents'
import { CREATIVE_TEAM_AGENT_IDS, DEFAULT_AGENT_STATES } from '@/lib/creative-team/types'
import type { AgentState, CreativeTeamAgentId } from '@/lib/creative-team/types'
import {
  patchCreativeTeamAgentState,
  verifyCreativeTeamReport,
} from '@/lib/creative-team/creative-team-db.server'
import { resolveCreativeTeamContext } from '@/lib/creative-team/resolve-context.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AgentAction = 'accept' | 'reject' | 'regenerate'

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const reportId = String(parsed.body!.reportId || '').trim()
    const agentId = parsed.body!.agentId as CreativeTeamAgentId
    const action = parsed.body!.action as AgentAction

    if (!reportId || !agentId || !action) {
      return NextResponse.json({ error: 'reportId, agentId, action required' }, { status: 400 })
    }
    if (!CREATIVE_TEAM_AGENT_IDS.includes(agentId)) {
      return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 })
    }
    if (!['accept', 'reject', 'regenerate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const userId = auth.user!.id
    const existing = await verifyCreativeTeamReport(reportId, userId)
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const agentStates = { ...existing.agentStates }
    let patch = {} as Parameters<typeof patchCreativeTeamAgentState>[3]

    if (action === 'accept') {
      agentStates[agentId] = 'accepted'
    } else if (action === 'reject') {
      agentStates[agentId] = 'rejected'
    } else {
      agentStates[agentId] = 'regenerate'
      const ctx = await resolveCreativeTeamContext(existing.projectId, userId)
      if (!ctx) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      const priorReports = {
        'story-strategist': existing.storyStrategy ?? undefined,
        'executive-producer': existing.producerReport ?? undefined,
        screenwriter: existing.screenwriterReport ?? undefined,
        cinematographer: existing.cinematographyReport ?? undefined,
        'voice-director': existing.voiceReport ?? undefined,
        'music-director': existing.musicReport ?? undefined,
      }
      priorReports[agentId] = undefined

      agentStates[agentId] = 'running'
      const report = await getCreativeTeamAgent(agentId).run({
        ...ctx,
        priorReports,
      })
      agentStates[agentId] = 'pending'

      const keyMap = {
        'story-strategist': 'storyStrategy',
        'executive-producer': 'producerReport',
        screenwriter: 'screenwriterReport',
        cinematographer: 'cinematographyReport',
        'voice-director': 'voiceReport',
        'music-director': 'musicReport',
      } as const

      patch = { [keyMap[agentId]]: report }

      if (agentId === 'executive-producer' && report.payload) {
        await upsertProducerReport(existing.projectId, userId, report.payload as ProducerReport)
      }

      const nextPkg = {
        ...existing,
        ...patch,
        agentStates,
      }
      patch.alignmentScore = computeCreativeAlignmentScore(nextPkg)
    }

    const nextState: AgentState = agentStates[agentId]!
    agentStates[agentId] = action === 'regenerate' ? 'pending' : nextState

    const { data, error } = await patchCreativeTeamAgentState(
      reportId,
      userId,
      agentStates,
      patch
    )

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ package: data })
  } catch (err) {
    logError('director.creative-team.agent', err)
    return NextResponse.json({ error: 'Agent action failed' }, { status: 500 })
  }
}
