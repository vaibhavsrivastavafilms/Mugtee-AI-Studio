import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin/is-admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MugteeAgentEvents } from '@/lib/ai-agent/agent-analytics'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') || 30)))
  const since = new Date()
  since.setDate(since.getDate() - days)

  const agentEvents = Object.values(MugteeAgentEvents)

  const { data: events } = await supabase
    .from('analytics_events')
    .select('event, metadata, created_at')
    .gte('created_at', since.toISOString())
    .in('event', agentEvents)
    .limit(5000)

  const { data: workflows, error: wfError } = await supabase
    .from('agent_workflows')
    .select('status, created_at, metadata')
    .gte('created_at', since.toISOString())
    .limit(2000)

  const eventCounts: Record<string, number> = {}
  const toolUsage: Record<string, number> = {}
  let totalLatency = 0
  let latencySamples = 0

  for (const e of events ?? []) {
    const name = String(e.event ?? '')
    eventCounts[name] = (eventCounts[name] ?? 0) + 1
    const meta = (e.metadata ?? {}) as Record<string, unknown>
    if (name === MugteeAgentEvents.TOOL_EXECUTED && typeof meta.tool === 'string') {
      toolUsage[meta.tool] = (toolUsage[meta.tool] ?? 0) + 1
    }
    if (typeof meta.latencyMs === 'number') {
      totalLatency += meta.latencyMs
      latencySamples += 1
    }
  }

  const workflowStats = { total: 0, completed: 0, failed: 0, executing: 0 }
  for (const w of workflows ?? []) {
    workflowStats.total += 1
    const s = String(w.status ?? '')
    if (s === 'completed') workflowStats.completed += 1
    else if (s === 'failed') workflowStats.failed += 1
    else if (s === 'executing') workflowStats.executing += 1
  }

  const successRate =
    workflowStats.completed + workflowStats.failed > 0
      ? Math.round(
          (workflowStats.completed / (workflowStats.completed + workflowStats.failed)) * 100
        )
      : null

  return NextResponse.json({
    ok: true,
    days,
    eventCounts,
    toolUsage,
    workflowStats: wfError ? { ...workflowStats, tableMissing: true } : workflowStats,
    successRate,
    avgLatencyMs: latencySamples ? Math.round(totalLatency / latencySamples) : null,
  })
}
