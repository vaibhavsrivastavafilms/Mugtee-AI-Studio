'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart3, Crown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UsageSnapshot } from '@/lib/usage/usage-tracker'

type MetricKey = keyof UsageSnapshot['used']

const ROWS: { key: MetricKey; label: string }[] = [
  { key: 'projects', label: 'Projects' },
  { key: 'generations', label: 'Generations' },
  { key: 'exports', label: 'Exports' },
  { key: 'renders', label: 'Video Renders' },
]

function pct(used: number, limit: number, unlimited: boolean): number {
  if (unlimited || !Number.isFinite(limit) || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export function UsageOverview() {
  const [data, setData] = useState<UsageSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/usage', { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as UsageSnapshot
        if (!cancelled) setData(json)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-6 sm:p-7 border border-gold-soft"
      >
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading usage…
        </div>
      </motion.div>
    )
  }

  if (!data) return null

  const unlimited = data.unlimited
  const planLabel = unlimited ? 'Unlimited' : data.plan_type || 'FREE'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="glass-strong rounded-2xl p-6 sm:p-7 border border-gold-soft"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-gold-300" />
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
              Usage overview
            </div>
          </div>
          <h2 className="font-display text-2xl">
            Plan <span className="text-gold-gradient">{planLabel}</span>
          </h2>
          <p className="text-[12px] text-luxe/65 mt-1">
            {unlimited
              ? 'Your trial or paid plan includes unlimited usage.'
              : 'Track your FREE plan usage. Upgrade coming soon for higher limits.'}
          </p>
        </div>
        {!unlimited ? (
          <Link
            href="#upgrade"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium tracking-wide bg-white/[0.04] border border-white/[0.08] text-luxe/70 cursor-not-allowed opacity-80 shrink-0"
            aria-disabled
            onClick={(e) => e.preventDefault()}
          >
            <Crown className="w-3.5 h-3.5" /> Upgrade Coming Soon
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ROWS.map(({ key, label }) => {
          const used = data.used[key]
          const limit = data.limits[key]
          const atCap = !unlimited && used >= limit
          const bar = pct(used, limit, unlimited)

          return (
            <div
              key={key}
              className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground">
                  {label}
                </div>
                <div
                  className={cn(
                    'text-sm font-medium tabular-nums',
                    atCap ? 'text-amber-300' : 'text-luxe'
                  )}
                >
                  {unlimited ? (
                    <span className="text-gold-gradient">{used} · ∞</span>
                  ) : (
                    <>
                      {used} / {limit}
                    </>
                  )}
                </div>
              </div>
              {!unlimited ? (
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      atCap ? 'bg-amber-400/90' : 'bg-gold-gradient'
                    )}
                    style={{ width: `${bar}%` }}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {!data.limits_enabled ? (
        <p className="text-[11px] text-muted-foreground mt-4">
          Plan limits are disabled on this environment (MUGTEE_LIMITS_ENABLED=false).
        </p>
      ) : null}
    </motion.div>
  )
}
