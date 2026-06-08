'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type HealthPayload = {
  generationJobs: {
    total: number
    active: number
    failed: number
    recent: Array<Record<string, unknown>>
  }
  exportJobs: {
    total: number
    completed: number
    failed: number
    successRate: number | null
    avgDurationMs: number | null
    recent: Array<Record<string, unknown>>
  }
  generationHealth: {
    storyboardSuccess: number
    voiceSuccess: number
    exportSuccess: number
    avgGenerationMs: number | null
  }
}

function msLabel(ms: number | null): string {
  if (ms == null) return '—'
  const sec = Math.round(ms / 1000)
  return sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/admin/health')
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 403 ? 'Admin access required' : 'Failed to load')
        return res.json() as Promise<HealthPayload>
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-luxe/50">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading QA center…
      </div>
    )
  }

  if (error) {
    return <p className="text-center py-20 text-red-300/80">{error}</p>
  }

  if (!data) return null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/70">Production QA</p>
        <h1 className="text-2xl font-display text-luxe mt-1">Health Center</h1>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Jobs', value: String(data.generationJobs.active) },
          { label: 'Failed Jobs', value: String(data.generationJobs.failed) },
          {
            label: 'Export Success',
            value: data.exportJobs.successRate != null ? `${data.exportJobs.successRate}%` : '—',
          },
          { label: 'Avg Export', value: msLabel(data.exportJobs.avgDurationMs) },
          { label: 'Avg Generation', value: msLabel(data.generationHealth.avgGenerationMs) },
          { label: 'Storyboard OK', value: String(data.generationHealth.storyboardSuccess) },
          { label: 'Voice OK', value: String(data.generationHealth.voiceSuccess) },
          { label: 'Exports Done', value: String(data.exportJobs.completed) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2"
          >
            <p className="text-[9px] uppercase tracking-wider text-luxe/40">{s.label}</p>
            <p className="text-lg font-display text-gold-200/90 tabular-nums">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-luxe/85">Recent Exports</h2>
        <ul className="space-y-1 text-[11px] text-luxe/60">
          {data.exportJobs.recent.map((job) => (
            <li
              key={String(job.id)}
              className={cn(
                'rounded border border-white/[0.06] px-2 py-1.5',
                job.status === 'failed' && 'border-red-500/20'
              )}
            >
              {String(job.id).slice(0, 16)}… · {String(job.status)} · {String(job.progress)}%
              {job.error ? ` · ${String(job.error).slice(0, 80)}` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-luxe/85">Generation Jobs</h2>
        <ul className="space-y-1 text-[11px] text-luxe/60">
          {data.generationJobs.recent.map((job) => (
            <li key={String(job.id)} className="rounded border border-white/[0.06] px-2 py-1.5">
              {String(job.id).slice(0, 16)}… · {String(job.status)} · {String(job.current_step)} ·{' '}
              {String(job.progress)}%
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
