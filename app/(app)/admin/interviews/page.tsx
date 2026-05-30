'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import type { CreatorInterviewRow } from '@/app/api/admin/interviews/route'
import type { RankedCount } from '@/lib/admin/founder-dashboard-metrics'

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState<CreatorInterviewRow[]>([])
  const [features, setFeatures] = useState<RankedCount[]>([])
  const [totals, setTotals] = useState({ founding_applications: 0, project_feedback: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/interviews', { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!cancelled) {
            setError(
              res.status === 403
                ? 'Admin access required (set ADMIN_EMAILS or ADMIN_USER_IDS).'
                : String((body as { error?: string }).error || res.statusText)
            )
          }
          return
        }
        if (!cancelled) {
          setInterviews((body as { interviews?: CreatorInterviewRow[] }).interviews ?? [])
          setFeatures(
            (body as { most_requested_features?: RankedCount[] }).most_requested_features ?? []
          )
          setTotals(
            (body as { totals?: typeof totals }).totals ?? {
              founding_applications: 0,
              project_feedback: 0,
            }
          )
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load interviews')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto w-full pb-12">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/60 hover:text-luxe transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Founder Dashboard
        </Link>
        <Link
          href="/admin/feedback"
          className="inline-flex items-center gap-1 text-xs text-gold-300/80 hover:text-gold-300 transition ml-auto"
        >
          Raw feedback <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">Creator Interviews</h1>
      <p className="text-sm text-luxe/55 mb-6">
        Founding creator applications and project feedback — pain points, requests, and aggregated
        feature signals.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading interviews…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90 py-8 text-center">{error}</p>
      ) : (
        <div className="space-y-8">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground">
                Founding applications
              </p>
              <p className="font-display text-2xl text-luxe mt-1">{totals.founding_applications}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-[10px] tracking-wider uppercase text-muted-foreground">
                Project feedback rows
              </p>
              <p className="font-display text-2xl text-luxe mt-1">{totals.project_feedback}</p>
            </div>
          </div>

          <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
              Most requested features
            </h2>
            {features.length === 0 ? (
              <p className="text-sm text-luxe/45">No feature signals yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm text-luxe/80">
                {features.map((row) => (
                  <li key={row.name} className="flex justify-between gap-2">
                    <span className="truncate">{row.name}</span>
                    <span className="text-gold-300/90 tabular-nums shrink-0">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                  <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">Source</th>
                  <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">Creator</th>
                  <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">
                    Pain / feedback
                  </th>
                  <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">
                    Requested features
                  </th>
                  <th className="px-4 py-2 text-[10px] uppercase text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-luxe/45">
                      No interview data yet.
                    </td>
                  </tr>
                ) : (
                  interviews.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="border-b border-white/[0.05]">
                      <td className="px-4 py-2 text-xs text-luxe/60 whitespace-nowrap">
                        {row.source === 'founding_application' ? 'Founding' : 'Feedback'}
                        {row.rating ? ` · ${row.rating}/5` : ''}
                      </td>
                      <td className="px-4 py-2 max-w-[140px]">
                        <p className="truncate text-luxe/85">{row.name || '—'}</p>
                        {row.email ? (
                          <p className="truncate text-[11px] text-luxe/45">{row.email}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 capitalize text-luxe/70 whitespace-nowrap">
                        {row.creator_type?.replace(/_/g, ' ') || '—'}
                      </td>
                      <td className="px-4 py-2 max-w-xs text-luxe/75 line-clamp-3">
                        {row.pain_points || row.feedback || '—'}
                      </td>
                      <td className="px-4 py-2 max-w-xs text-luxe/75 line-clamp-3">
                        {row.requested_features || '—'}
                      </td>
                      <td className="px-4 py-2 text-xs text-luxe/50 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
