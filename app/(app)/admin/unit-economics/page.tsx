'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { UnitEconomicsDashboard } from '@/lib/admin/unit-economics-metrics'

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-[10px] tracking-wider uppercase text-muted-foreground">{label}</p>
      <p className="font-display text-2xl text-luxe mt-1">{value}</p>
      {hint ? <p className="text-[11px] text-luxe/45 mt-1">{hint}</p> : null}
    </div>
  )
}

export default function UnitEconomicsAdminPage() {
  const [metrics, setMetrics] = useState<UnitEconomicsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/unit-economics', { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!cancelled) {
            setError(
              res.status === 403
                ? 'Admin access required.'
                : String((body as { error?: string }).error || res.statusText)
            )
          }
          return
        }
        if (!cancelled) {
          setMetrics((body as { metrics?: UnitEconomicsDashboard }).metrics ?? null)
        }
      } catch {
        if (!cancelled) setError('Failed to load metrics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs text-luxe/50 hover:text-luxe"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Admin
        </Link>
      </div>

      <header>
        <h1 className="font-display text-2xl text-luxe">Unit Economics</h1>
        <p className="text-sm text-luxe/55 mt-1">
          COGS estimates, plan margins, and export job health.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90">{error}</p>
      ) : metrics ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="60s Creator reel (gen)"
              value={`$${metrics.estimates.creator60sGenerationUsd.toFixed(2)}`}
            />
            <Metric
              label="60s export"
              value={`$${metrics.estimates.creator60sExportUsd.toFixed(2)}`}
            />
            <Metric
              label="60s total (target)"
              value={`$${metrics.estimates.creator60sTotalUsd.toFixed(2)}`}
              hint="Goal: $0.20–0.35"
            />
            <Metric
              label="30d est. COGS"
              value={`$${metrics.usage30d.estimatedCogsUsd.toFixed(0)}`}
              hint={`${metrics.usage30d.generations} gen · ${metrics.usage30d.exports} exports`}
            />
          </section>

          <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
              Plan margin at cap usage
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-luxe/80">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-luxe/40">
                    <th className="pb-2 pr-4">Tier</th>
                    <th className="pb-2 pr-4">Price</th>
                    <th className="pb-2 pr-4">Max COGS/mo</th>
                    <th className="pb-2">Gross margin</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.planEconomics.map((row) => (
                    <tr key={row.tier} className="border-t border-white/[0.06]">
                      <td className="py-2 pr-4">{row.tier}</td>
                      <td className="py-2 pr-4">₹{row.priceInr.toLocaleString('en-IN')}</td>
                      <td className="py-2 pr-4">${row.maxMonthlyCogsUsd.toFixed(0)}</td>
                      <td className="py-2">{row.grossMarginPctAtCap}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
                Export jobs (30d)
              </h2>
              <ul className="text-sm text-luxe/75 space-y-1">
                <li>Total: {metrics.exportJobs.total}</li>
                <li>Failed: {metrics.exportJobs.failed}</li>
                <li>Retry capped: {metrics.exportJobs.retryBlocked}</li>
                <li>
                  Avg render:{' '}
                  {metrics.exportJobs.avgRenderSeconds != null
                    ? `${metrics.exportJobs.avgRenderSeconds}s`
                    : '—'}
                </li>
                <li>
                  Avg cost est.:{' '}
                  {metrics.exportJobs.avgCostEstimateUsd != null
                    ? `$${metrics.exportJobs.avgCostEstimateUsd}`
                    : '—'}
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
                Provider spend proxy (30d)
              </h2>
              <ul className="text-sm text-luxe/75 space-y-1">
                <li>OpenAI: ${metrics.providerSpendProxy.openaiProxyUsd}</li>
                <li>Perplexity: ${metrics.providerSpendProxy.perplexityProxyUsd}</li>
                <li>Runway: ${metrics.providerSpendProxy.runwayProxyUsd}</li>
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
