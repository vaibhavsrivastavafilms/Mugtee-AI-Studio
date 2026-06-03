import type { SupabaseClient } from '@supabase/supabase-js'
import { getRecentIntegrationFailures } from '@/lib/integrations/integration-monitor'
import { MugteeAgentEvents } from '@/lib/ai-agent/agent-analytics'

export async function getEcosystemObservability(
  supabase: SupabaseClient,
  days = 30
) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: events } = await supabase
    .from('analytics_events')
    .select('event, metadata, created_at')
    .gte('created_at', since.toISOString())
    .in('event', Object.values(MugteeAgentEvents))
    .limit(3000)

  const { data: installs } = await supabase
    .from('agent_installs')
    .select('agent_slug, status, installed_at')
    .eq('status', 'active')
    .limit(500)

  const { data: integrations } = await supabase
    .from('user_integrations')
    .select('provider, status')
    .limit(500)

  const toolUsage: Record<string, number> = {}
  let totalLatency = 0
  let latencySamples = 0

  for (const e of events ?? []) {
    const meta = (e.metadata ?? {}) as Record<string, unknown>
    if (e.event === MugteeAgentEvents.TOOL_EXECUTED && typeof meta.tool === 'string') {
      toolUsage[meta.tool] = (toolUsage[meta.tool] ?? 0) + 1
    }
    if (typeof meta.latencyMs === 'number') {
      totalLatency += meta.latencyMs
      latencySamples += 1
    }
  }

  const agentInstalls: Record<string, number> = {}
  for (const row of installs ?? []) {
    agentInstalls[row.agent_slug] = (agentInstalls[row.agent_slug] ?? 0) + 1
  }

  const integrationHealth: Record<string, number> = {}
  for (const row of integrations ?? []) {
    integrationHealth[row.status] = (integrationHealth[row.status] ?? 0) + 1
  }

  return {
    days,
    agentUsage: toolUsage,
    agentInstalls,
    integrationHealth,
    integrationFailures: getRecentIntegrationFailures(10),
    avgToolLatencyMs: latencySamples ? Math.round(totalLatency / latencySamples) : 0,
    costHint: 'Billing stub — tie to provider usage in Phase 6',
  }
}
