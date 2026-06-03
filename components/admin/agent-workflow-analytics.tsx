'use client'

import { useEffect, useState } from 'react'

type AgentAnalyticsResponse = {
  ok?: boolean
  eventCounts?: Record<string, number>
  toolUsage?: Record<string, number>
  workflowStats?: { total: number; completed: number; failed: number; executing: number }
  successRate?: number | null
  avgLatencyMs?: number | null
  error?: string
}

export function AgentWorkflowAnalytics() {
  const [data, setData] = useState<AgentAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/agent-analytics?days=30', { cache: 'no-store' })
        const json = (await res.json()) as AgentAnalyticsResponse
        setData(json)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <p className="text-sm text-luxe/50">Loading agent analytics…</p>
  if (data?.error) return <p className="text-sm text-red-400">{data.error}</p>

  const stats = data?.workflowStats

  return (
    <section className="mt-8 space-y-4">
      <h2 className="font-display text-lg text-luxe">MugteeOS Agent (30d)</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Workflows" value={stats?.total ?? 0} />
        <Metric label="Completed" value={stats?.completed ?? 0} />
        <Metric label="Success %" value={data?.successRate != null ? `${data.successRate}%` : '—'} />
        <Metric
          label="Avg tool latency"
          value={data?.avgLatencyMs != null ? `${data.avgLatencyMs}ms` : '—'}
        />
      </div>
      {data?.toolUsage && Object.keys(data.toolUsage).length ? (
        <div className="rounded-xl border border-white/[0.08] p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Tool usage</p>
          <ul className="text-xs text-luxe/80 space-y-1">
            {Object.entries(data.toolUsage)
              .sort((a, b) => b[1] - a[1])
              .map(([tool, count]) => (
                <li key={tool} className="flex justify-between">
                  <span>{tool}</span>
                  <span className="tabular-nums text-cyan-300/90">{count}</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-xl text-luxe mt-1">{value}</p>
    </div>
  )
}
