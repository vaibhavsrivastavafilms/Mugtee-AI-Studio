'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ReferralRow = {
  id: string
  referrer_email: string
  invitee_email: string
  code: string
  reward_granted: boolean
  signup_date: string
}

export default function AdminReferralsPage() {
  const [items, setItems] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/referrals', { cache: 'no-store' })
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
        if (!cancelled) setError((e as Error).message || 'Failed to load referrals')
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
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/60 hover:text-luxe transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Settings
        </Link>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">Referrals</h1>
      <p className="text-sm text-luxe/55 mb-6">Creator invite attributions and reward status.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-300/90 py-8 text-center">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-luxe/50 py-8 text-center">No referrals yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Referrer</th>
                <th className="px-4 py-3 font-medium">Invitee</th>
                <th className="px-4 py-3 font-medium">Signup date</th>
                <th className="px-4 py-3 font-medium">Reward</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.05] hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-luxe/90 max-w-[200px] truncate">
                    {row.referrer_email}
                  </td>
                  <td className="px-4 py-3 text-luxe/90 max-w-[200px] truncate">
                    {row.invitee_email}
                  </td>
                  <td className="px-4 py-3 text-luxe/70 whitespace-nowrap">
                    {row.signup_date
                      ? new Date(row.signup_date).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full border',
                        row.reward_granted
                          ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                          : 'border-amber-500/30 text-amber-200 bg-amber-500/10'
                      )}
                    >
                      {row.reward_granted ? 'Granted' : 'Pending'}
                    </span>
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
