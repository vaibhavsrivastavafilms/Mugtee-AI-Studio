import {
  CREATIVE_TEAM_AGENTS,
  getCreativeTeamAgent,
  type OrchestratorResult,
} from '@/lib/creative-team/agents'
import { alignmentFromReports } from '@/lib/creative-team/alignment-score'
import type {
  AgentReport,
  AgentStatesMap,
  CreativeTeamAgentId,
  CreativeTeamContext,
  CreativeTeamPackage,
} from '@/lib/creative-team/types'

export type RunCreativeTeamOptions = {
  agentId?: CreativeTeamAgentId
  agentStates: AgentStatesMap
  existingReports?: Partial<Record<CreativeTeamAgentId, AgentReport>>
}

export async function runCreativeTeamOrchestrator(
  ctx: CreativeTeamContext,
  options: RunCreativeTeamOptions
): Promise<OrchestratorResult> {
  const { agentId, agentStates, existingReports } = options
  const reports: Partial<Record<CreativeTeamAgentId, AgentReport>> = {
    ...(existingReports ?? {}),
  }

  const agentsToRun = agentId ? [getCreativeTeamAgent(agentId)] : CREATIVE_TEAM_AGENTS

  for (const agent of agentsToRun) {
    const report = await agent.run({
      ...ctx,
      priorReports: reports,
    })
    reports[agent.id] = report
  }

  const alignmentScore = alignmentFromReports(reports)

  return {
    package: {
      projectId: ctx.projectId,
      userId: ctx.userId,
      storyStrategy:
        (reports['story-strategist'] as CreativeTeamPackage['storyStrategy']) ?? null,
      producerReport:
        (reports['executive-producer'] as CreativeTeamPackage['producerReport']) ?? null,
      screenwriterReport:
        (reports.screenwriter as CreativeTeamPackage['screenwriterReport']) ?? null,
      cinematographyReport:
        (reports.cinematographer as CreativeTeamPackage['cinematographyReport']) ?? null,
      voiceReport: (reports['voice-director'] as CreativeTeamPackage['voiceReport']) ?? null,
      musicReport: (reports['music-director'] as CreativeTeamPackage['musicReport']) ?? null,
      alignmentScore,
      agentStates,
    },
    reports,
  }
}
