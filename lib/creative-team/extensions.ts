import type { AgentReport, CreativeTeamAgentId, CreativeTeamContext } from '@/lib/creative-team/types'

/** Future: multi-agent debate before presenting recommendations to the director. */
export interface AgentDebate {
  topic: string
  participants: CreativeTeamAgentId[]
  rounds: number
  run(ctx: CreativeTeamContext): Promise<AgentReport[]>
}

/** Future: iterative refinement passes until alignment threshold is met. */
export interface MultiPassRefinement {
  maxPasses: number
  alignmentThreshold: number
  refine(
    ctx: CreativeTeamContext,
    reports: Partial<Record<CreativeTeamAgentId, AgentReport>>
  ): Promise<Partial<Record<CreativeTeamAgentId, AgentReport>>>
}
