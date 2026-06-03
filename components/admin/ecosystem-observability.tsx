'use client'

import { useEffect, useState } from 'react'

type Metrics = {
  days: number
  agentUsage: Record<string, number>
  agentInstalls: Record<string, number>
  integrationHealth: Record<string, number>
  integrationFailures: Array<{ provider: string; error: string; at: string }>
  avgToolLatencyMs: number
  costHint: string
}

export function EcosystemObservability() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/ecosystem?days=30', { cache: 'no-store' })
      if (!res.ok) {
        setError(res.status === 403 ? 'Admin access required' : 'Failed to load')
        return
      }
      setMetrics((await res.json()) as Metrics)
    })()
  }, [])

  if (error) return <p className="text-sm text-red-400/90">{error}</p>
  if (!metrics) return <p className="text-sm text-luxe/50">Loading ecosystem metrics…</p>

  return (
    <section className="mt-10 space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="font-display text-lg text-luxe">Ecosystem observability</h2>
      <p className="text-xs text-luxe/45">{metrics.costHint}</p>
      <div className="grid gap-4 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-luxe/50 text-xs uppercase tracking-wider mb-1">Avg tool latency</p>
          <p className="text-luxe font-mono">{metrics.avgToolLatencyMs} ms</p>
        </div>
        <div>
          <p className="text-luxe/50 text-xs uppercase tracking-wider mb-1">Agent installs</p>
          <pre className="text-xs text-luxe/70 overflow-auto">
            {JSON.stringify(metrics.agentInstalls, null, 2)}
          </pre>
        </div>
        <div>
          <p className="text-luxe/50 text-xs uppercase tracking-wider mb-1">Integrations</p>
          <pre className="text-xs text-luxe/70 overflow-auto">
            {JSON.stringify(metrics.integrationHealth, null, 2)}
          </pre>
        </div>
      </div>
      <div>
        <p className="text-luxe/50 text-xs uppercase tracking-wider mb-1">Tool usage</p>
        <pre className="text-xs text-luxe/70 overflow-auto max-h-40">
          {JSON.stringify(metrics.agentUsage, null, 2)}
        </pre>
      </div>
      {metrics.integrationFailures.length > 0 ? (
        <div>
          <p className="text-luxe/50 text-xs uppercase tracking-wider mb-1">Recent failures</p>
          <ul className="text-xs text-red-300/80 space-y-1">
            {metrics.integrationFailures.map((f, i) => (
              <li key={i}>
                {f.provider}: {f.error}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
