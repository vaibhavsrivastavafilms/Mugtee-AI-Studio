import { storyStrategistAgent } from '@/lib/creative-team/agents/story-strategist'
import { executiveProducerAgent } from '@/lib/creative-team/agents/executive-producer'
import { screenwriterAgent } from '@/lib/creative-team/agents/screenwriter'
import { cinematographerAgent } from '@/lib/creative-team/agents/cinematographer'
import { voiceDirectorAgent } from '@/lib/creative-team/agents/voice-director'
import { musicDirectorAgent } from '@/lib/creative-team/agents/music-director'
import type { CreativeTeamAgent, CreativeTeamAgentId, AgentReport, AgentStatesMap, CreativeTeamContext, CreativeTeamPackage } from '@/lib/creative-team/types'
import { DEFAULT_AGENT_STATES as defaultStates } from '@/lib/creative-team/types'
import { computeCreativeAlignmentScore } from '@/lib/creative-team/alignment-score'

/** Sequential orchestration order: Strategist → Producer → Screenwriter → Cinematographer → Voice → Music */
export const CREATIVE_TEAM_AGENTS: CreativeTeamAgent[] = [
  storyStrategistAgent,
  executiveProducerAgent,
  screenwriterAgent,
  cinematographerAgent,
  voiceDirectorAgent,
  musicDirectorAgent,
]

export const CREATIVE_TEAM_AGENT_MAP: Record<CreativeTeamAgentId, CreativeTeamAgent> =
  Object.fromEntries(CREATIVE_TEAM_AGENTS.map((a) => [a.id, a])) as Record<
    CreativeTeamAgentId,
    CreativeTeamAgent
  >

export function getCreativeTeamAgent(id: CreativeTeamAgentId): CreativeTeamAgent {
  return CREATIVE_TEAM_AGENT_MAP[id]
}

export type OrchestratorResult = {
  package: Omit<CreativeTeamPackage, 'reportId' | 'createdAt' | 'updatedAt'>
  reports: Partial<Record<CreativeTeamAgentId, AgentReport>>
}
