import { trackServerEvent } from '@/lib/analytics/track-server-event'

export const MugteeAgentEvents = {
  GOAL_SUBMITTED: 'mugtee_agent_goal_submitted',
  COMMAND_RECEIVED: 'mugtee_agent_command_received',
  INTENT_PARSED: 'mugtee_agent_intent_parsed',
  PLAN_CREATED: 'mugtee_agent_plan_created',
  WORKFLOW_STARTED: 'mugtee_agent_workflow_started',
  WORKFLOW_COMPLETED: 'mugtee_agent_workflow_completed',
  WORKFLOW_FAILED: 'mugtee_agent_workflow_failed',
  TOOL_EXECUTED: 'mugtee_agent_tool_executed',
} as const

export async function trackAgentEvent(
  event: (typeof MugteeAgentEvents)[keyof typeof MugteeAgentEvents],
  userId: string,
  metadata: Record<string, unknown> & { workflowId?: string; latencyMs?: number }
): Promise<void> {
  await trackServerEvent({
    event,
    userId,
    metadata: {
      source: 'mugtee_os_phase2',
      ...metadata,
    },
  })
}
