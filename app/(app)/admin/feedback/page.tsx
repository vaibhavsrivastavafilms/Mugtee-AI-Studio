'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type FeedbackRow = {
  id: string
  rating: number
  feedback: string | null
  creator_type: string | null
  project_id: string | null
  date: string
}

function formatCreatorType(value: string | null): string {
  if (!value) return '—'
  return value.replace(/_/g, ' ')
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/feedback', { cache: 'no-store' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          if (!cancelled) {
            setError(
              res.status === 403
                ? 'Admin access required (set ADMIN_EMAILS or ADMIN_USER_IDS).'
                : String((body as { error?: string }).error || res.statusText)
            )
          }
          return
        }
        const data = await res.json()
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : [])
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Failed to load feedback')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/60 hover:text-luxe transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Founder Dashboard
        </Link>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/45 hover:text-luxe transition"
        >
          Settings
        </Link>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">Creator feedback</h1>
      <p className="text-sm text-luxe/55 mb-6">Post-generation ratings from the Founding Creator Beta.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90 py-8 text-center">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-luxe/50 py-8 text-center">No feedback submitted yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                <th className="px-4 py-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Rating
                </th>
                <th className="px-4 py-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Feedback
                </th>
                <th className="px-4 py-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Creator Type
                </th>
                <th className="px-4 py-3 text-[10px] tracking-wider uppercase text-muted-foreground font-medium">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-gold-300 font-medium">{row.rating}</span>
                    <span className="text-luxe/40"> / 5</span>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p className={cn('text-luxe/80 line-clamp-3', !row.feedback && 'text-luxe/35 italic')}>
                      {row.feedback || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap capitalize text-luxe/70">
                    {formatCreatorType(row.creator_type)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-luxe/55 text-xs">
                    {row.date ? new Date(row.date).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
