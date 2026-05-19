'use client'
// Phase P6 — Analytics Light. Real aggregates computed from useStore() + useUsage().
// Zero new API endpoints, zero migrations. All data already loaded by StoreProvider.

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { TrendingUp, Calendar, CheckCircle2, Sparkles, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useUsage, LIMITS } from '@/lib/usage'
import { AdSlot } from '@/components/ads/ad-slot'
import type { ContentPiece, ContentStatus, Platform } from '@/lib/types'

const STATUS_ORDER: ContentStatus[] = ['idea', 'scripting', 'shooting', 'editing', 'scheduled', 'published']
const STATUS_LABEL: Record<ContentStatus, string> = {
  idea: 'Ideas', scripting: 'Scripting', shooting: 'Shooting',
  editing: 'Editing', scheduled: 'Scheduled', published: 'Published',
}
const PLATFORM_LABEL: Record<Platform, string> = {
  youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok',
  twitter: 'Twitter', linkedin: 'LinkedIn', facebook: 'Facebook', reddit: 'Reddit',
}

function dayKey(d: Date) { return d.toISOString().slice(0, 10) }
function fmtDelta(delta: number) {
  if (delta === 0) return { txt: '0%', up: true, neutral: true }
  const up = delta > 0
  const abs = Math.abs(delta)
  return { txt: `${up ? '+' : '−'}${abs > 999 ? '999+' : abs}${typeof delta === 'number' ? '' : ''}`, up, neutral: false }
}

export default function AnalyticsPage() {
  const { content, activity, loading } = useStore()
  const { usage, limit, plan } = useUsage()

  // ---- Aggregates ----
  const stats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const last7Start  = new Date(today); last7Start.setDate(today.getDate() - 6)
    const prev7Start  = new Date(today); prev7Start.setDate(today.getDate() - 13)
    const prev7End    = new Date(today); prev7End.setDate(today.getDate() - 7)

    let scheduled = 0
    let publishedAll = 0
    let publishedThisMonth = 0
    let createdLast7 = 0
    let createdPrev7 = 0
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    content.forEach((c: ContentPiece) => {
      if (c.status === 'scheduled') scheduled++
      if (c.status === 'published') {
        publishedAll++
        const createdAt = c.created_at ? new Date(c.created_at) : null
        if (createdAt && createdAt >= startOfMonth) publishedThisMonth++
      }
      if (c.created_at) {
        const t = new Date(c.created_at)
        if (t >= last7Start && t <= now) createdLast7++
        else if (t >= prev7Start && t < prev7End) createdPrev7++
      }
    })

    const deltaCreated = createdLast7 - createdPrev7
    const totalDeltaPct = createdPrev7 > 0 ? Math.round((deltaCreated / createdPrev7) * 100) : (createdLast7 > 0 ? 100 : 0)

    return {
      total: content.length,
      scheduled,
      publishedThisMonth,
      publishedAll,
      createdLast7,
      createdPrev7,
      deltaCreated,
      totalDeltaPct,
    }
  }, [content])

  // ---- 14-day velocity (content created per day) ----
  const velocity = useMemo(() => {
    const today = new Date()
    const days: { d: string; label: string; v: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(today)
      dt.setDate(today.getDate() - i)
      days.push({ d: dayKey(dt), label: dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), v: 0 })
    }
    const idx = new Map(days.map((x, i) => [x.d, i]))
    content.forEach(c => {
      if (!c.created_at) return
      const k = dayKey(new Date(c.created_at))
      const i = idx.get(k)
      if (i !== undefined) days[i].v++
    })
    return days
  }, [content])

  // ---- By platform ----
  const byPlatform = useMemo(() => {
    const map = new Map<Platform, number>()
    content.forEach(c => map.set(c.platform, (map.get(c.platform) || 0) + 1))
    const arr = Array.from(map.entries())
      .map(([k, v]) => ({ name: PLATFORM_LABEL[k] || k, v }))
      .sort((a, b) => b.v - a.v)
    return arr
  }, [content])

  // ---- Status funnel ----
  const statusFunnel = useMemo(() => {
    const map: Record<ContentStatus, number> = { idea: 0, scripting: 0, shooting: 0, editing: 0, scheduled: 0, published: 0 }
    content.forEach(c => { if (map[c.status] !== undefined) map[c.status]++ })
    const max = Math.max(1, ...Object.values(map))
    return STATUS_ORDER.map(s => ({ key: s, label: STATUS_LABEL[s], value: map[s], pct: Math.round((map[s] / max) * 100) }))
  }, [content])

  // ---- Stat cards ----
  const aiUsed = usage.ai || 0
  const aiCap = plan === 'free' ? LIMITS.free.ai : null

  const statCards = [
    {
      label: 'Total Content', value: stats.total, delta: stats.totalDeltaPct, deltaSuffix: '%',
      icon: TrendingUp, sub: `${stats.createdLast7} created · last 7 days`,
    },
    {
      label: 'Scheduled', value: stats.scheduled, delta: null, deltaSuffix: '',
      icon: Calendar, sub: stats.scheduled === 0 ? 'Nothing queued yet' : `${stats.scheduled} ${stats.scheduled === 1 ? 'piece' : 'pieces'} queued`,
    },
    {
      label: 'Published · MTD', value: stats.publishedThisMonth, delta: null, deltaSuffix: '',
      icon: CheckCircle2, sub: `${stats.publishedAll} all-time`,
    },
    {
      label: 'AI Generations', value: aiUsed, delta: null, deltaSuffix: '',
      icon: Sparkles, sub: aiCap !== null ? `${aiUsed}/${aiCap} this month · free plan` : `${plan === 'creator' ? 'Creator' : 'Agency'} · unlimited`,
    },
  ]

  const empty = !loading.initial && content.length === 0

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Analytics</div>
        <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">Studio</span> performance</h1>
        <p className="text-sm text-muted-foreground mt-2">Real-time workflow analytics from your content pipeline · refreshes automatically.</p>
      </motion.div>

      {empty ? (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="glass rounded-2xl p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl glass-gold flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-gold-300" />
          </div>
          <h3 className="font-display text-2xl mb-1">No content yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create your first piece in the Pipeline or Calendar to start seeing live analytics here — workflow velocity, status funnel, platform mix and AI usage.
          </p>
        </motion.div>
      ) : null}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon
          const showDelta = s.delta !== null && s.delta !== undefined
          const f = showDelta ? fmtDelta(s.delta as number) : null
          return (
            <motion.div key={s.label}
              initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg glass-gold flex items-center justify-center"><Icon className="w-4 h-4 text-gold-300" /></div>
                {f && !f.neutral && (
                  <span className={`text-[10px] inline-flex items-center gap-0.5 ${f.up ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {f.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {f.txt}{s.deltaSuffix}
                  </span>
                )}
                {f && f.neutral && (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground">{s.label}</div>
              <div className="font-display text-3xl mt-1 tabular-nums">{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-2">{s.sub}</div>
            </motion.div>
          )
        })}
      </div>

      {/* Velocity + Platform charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{opacity:0, y:14}} animate={{opacity:1,y:0}} className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Workflow Velocity</div>
              <h3 className="font-display text-2xl mt-1">Content created · 14 days</h3>
            </div>
            <div className="text-right">
              <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Last 7d</div>
              <div className="font-display text-xl text-luxe tabular-nums">{stats.createdLast7}</div>
            </div>
          </div>
          <div className="h-72">
            {content.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data yet · add content to populate</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocity}>
                  <defs>
                    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5D061" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#F5D061" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} />
                  <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(20,16,12,0.95)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12 }}
                    formatter={(val: any) => [val, 'Created']}
                    labelStyle={{ color: '#F5D061', fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="v" stroke="#F5D061" strokeWidth={2} fill="url(#gold)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div initial={{opacity:0, y:14}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="glass rounded-2xl p-6">
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Platform Mix</div>
          <h3 className="font-display text-2xl mt-1 mb-4">By channel</h3>
          <div className="h-72">
            {byPlatform.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No content yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPlatform} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" allowDecimals={false} stroke="#9ca3af" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(20,16,12,0.95)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12 }}
                    cursor={{ fill: 'rgba(245,208,97,0.05)' }}
                    formatter={(val: any) => [val, 'Pieces']}
                  />
                  <Bar dataKey="v" fill="#D4AF37" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Status funnel + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{opacity:0, y:14}} animate={{opacity:1,y:0}} className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Pipeline Funnel</div>
              <h3 className="font-display text-2xl mt-1">By status</h3>
            </div>
            <div className="text-right">
              <div className="text-[10px] tracking-wider uppercase text-muted-foreground">Total</div>
              <div className="font-display text-xl text-luxe tabular-nums">{stats.total}</div>
            </div>
          </div>
          <div className="space-y-3">
            {statusFunnel.map((s) => (
              <div key={s.key}>
                <div className="flex items-center justify-between text-[11px] tracking-wider uppercase text-muted-foreground mb-1.5">
                  <span>{s.label}</span>
                  <span className="tabular-nums text-luxe/80">{s.value}</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.value === 0 ? 0 : Math.max(4, s.pct)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={s.key === 'published' ? 'h-full bg-emerald-400/70 rounded-full' : 'h-full bg-gold-gradient rounded-full'}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{opacity:0, y:14}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="glass rounded-2xl p-6">
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Recent Activity</div>
          <h3 className="font-display text-2xl mt-1 mb-4">Studio log</h3>
          {activity.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center">No activity yet</div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {activity.slice(0, 12).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold-400 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-luxe truncate">
                      <span className="text-gold-300/90">{a.actor || 'You'}</span>{' '}
                      <span className="text-muted-foreground">{a.action || 'updated'}</span>{' '}
                      <span className="text-luxe/90">{a.target || ''}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {a.created_at ? new Date(a.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Phase 16 — Free-tier sponsor footer slot. Auto-hides for Creator/Agency. */}
      <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANALYTICS || ''} format="auto" />
    </div>
  )
}
