'use client'
// MUGTEE V4.0 — Product Analytics panel.
//
// Renders the headline cards + 3 cinematic pie charts on top of the existing
// analytics page. Pulls aggregate data from /api/analytics/summary (which gates
// admin reads via the ADMIN_USER_IDS env). Non-admins still get their PERSONAL
// funnel — same component, same code path, different scope.
//
// Zero new chart deps — uses Recharts which is already installed.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { BarChart3, FileText, Volume2, Image as ImgIcon, Users, TrendingUp, TrendingDown, Loader2, Lock, Eye, Crown, ArrowRight, Activity, Filter } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

const GOLD_PALETTE = ['#D4AF37', '#E8C268', '#9B7B25', '#F5C842', '#7A5F1C', '#FFD56B', '#BB8E2E', '#C9A03B']

interface Summary {
  ok: boolean
  admin: boolean
  window_days: number
  totals: Record<string, number>
  events_by_type: Record<string, number>
  languages: Record<string, number>
  workflows: Record<string, number>
  // V4.1 — added by /api/analytics/summary
  last_triggered?: Record<string, string>
  growth_by_event?: Record<string, number>
  series_7d?: { date: string; visitors: number; scripts: number; exports: number; published: number }[]
  funnel?: { visitors: number; signup_started: number; signup_completed: number; scripts_generated: number; exports: number; published: number }
}

export function MugteeAnalyticsPanel() {
  const [data, setData]       = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays]       = useState(30)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const r = await fetch(`/api/analytics/summary?days=${days}`, { cache: 'no-store' })
        const d = await r.json()
        if (!cancelled) setData(d)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [days])

  if (loading) {
    return (
      <section className="rounded-2xl glass border border-gold-soft p-5 sm:p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading product analytics\u2026
      </section>
    )
  }
  if (!data?.ok) return null

  const t = data.totals || {}
  const headlineCards = [
    { label: 'Visitors',     value: t.visitors        || 0, icon: Eye,       tone: 'text-amber-300'  },
    { label: 'Unique users', value: t.unique_users    || 0, icon: Users,     tone: 'text-gold-300'   },
    { label: 'Scripts',      value: t.scripts         || 0, icon: FileText,  tone: 'text-emerald-300'},
    { label: 'Voiceovers',   value: t.voiceovers      || 0, icon: Volume2,   tone: 'text-purple-300' },
    { label: 'Images',       value: t.images          || 0, icon: ImgIcon,   tone: 'text-cyan-300'   },
    { label: 'Exports',      value: t.exports         || 0, icon: TrendingUp,tone: 'text-rose-300'   },
  ]

  const workflowsData = Object.entries(data.workflows || {}).map(([k, v]) => ({ name: prettify(k), value: v }))
  const langData      = Object.entries(data.languages || {}).map(([k, v]) => ({ name: prettify(k), value: v }))
  const genData       = [
    { name: 'Scripts',    value: t.scripts    || 0 },
    { name: 'Voiceovers', value: t.voiceovers || 0 },
    { name: 'Images',     value: t.images     || 0 },
    { name: 'Videos',     value: t.videos     || 0 },
  ].filter(d => d.value > 0)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 inline-flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" /> Mugtee Analytics
            {data.admin ? (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/35 text-gold-200 text-[9.5px] tracking-[0.22em] uppercase">
                <Crown className="w-2.5 h-2.5" /> Admin
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-muted-foreground text-[9.5px] tracking-[0.22em] uppercase">
                <Lock className="w-2.5 h-2.5" /> Personal scope
              </span>
            )}
          </div>
          <h2 className="font-display text-xl sm:text-2xl mt-1">{data.admin ? 'Platform performance' : 'Your creator funnel'}</h2>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg bg-white/[0.03] border border-white/[0.08] p-0.5">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-2.5 py-1 text-[10.5px] tracking-wider uppercase rounded-md transition',
                days === d ? 'bg-gold-500/15 text-gold-200' : 'text-muted-foreground hover:text-luxe'
              )}
            >{d}d</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {headlineCards.map(c => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-xl glass border border-white/[0.05] hover:border-gold-500/30 transition p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{c.label}</span>
                <Icon className={cn('w-3.5 h-3.5', c.tone)} />
              </div>
              <div className="font-display text-2xl text-luxe">{c.value.toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PieCard title="Workflow mix"   subtitle="Content type"           data={workflowsData} empty="No scripts yet" />
        <PieCard title="Language usage" subtitle="Top creator languages"  data={langData}      empty="Language data appears once scripts run" />
        <PieCard title="Generation mix" subtitle={'Scripts \u00B7 Voice \u00B7 Images \u00B7 Video'} data={genData} empty="No generations yet" />
      </div>

      {/* V4.1 — 7-day trend chart (scripts, visitors, exports). Lazy-rendered \u2014
          single ResponsiveContainer, single Recharts import, no new chart libs. */}
      <TrendChart series={data.series_7d || []} />

      {/* V4.1 — Conversion funnel card + Top Events table side-by-side on desktop,
          stacked on mobile. Investor-ready growth signal in two glances. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelCard funnel={data.funnel} />
        <TopEventsTable
          counts={data.events_by_type || {}}
          lastTriggered={data.last_triggered || {}}
          growth={data.growth_by_event || {}}
        />
      </div>
    </motion.section>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// V4.1 — Sub-components: TrendChart, FunnelCard, TopEventsTable.
// ────────────────────────────────────────────────────────────────────────────

function TrendChart({ series }: { series: Summary['series_7d'] }) {
  const data = (series || []).map(d => ({ ...d, label: d.date.slice(5) }))
  const empty = data.every(d => d.scripts === 0 && d.visitors === 0 && d.exports === 0)
  return (
    <div className="rounded-2xl glass border border-gold-soft p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85 inline-flex items-center gap-1.5">
            <Activity className="w-3 h-3" /> 7-day momentum
          </div>
          <div className="text-[10.5px] text-muted-foreground">Scripts \u00B7 Visitors \u00B7 Exports per day</div>
        </div>
        <div className="flex items-center gap-2.5 text-[10px] tracking-wider text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D4AF37]" /> Scripts</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7AB6FF]" /> Visitors</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7BE0B2]" /> Exports</span>
        </div>
      </div>
      {empty ? (
        <div className="h-[200px] flex items-center justify-center text-[12px] text-muted-foreground italic">Trend appears once events start flowing</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" stroke="#7a6a3e" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
            <YAxis stroke="#7a6a3e" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'rgba(20,16,12,0.95)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, fontSize: 11, color: '#E8D9A8' }}
              labelStyle={{ color: '#a18b56', fontSize: 10 }}
            />
            <Line type="monotone" dataKey="scripts"  stroke="#D4AF37" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="visitors" stroke="#7AB6FF" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="exports"  stroke="#7BE0B2" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function FunnelCard({ funnel }: { funnel: Summary['funnel'] }) {
  const f = funnel || { visitors: 0, signup_started: 0, signup_completed: 0, scripts_generated: 0, exports: 0, published: 0 }
  const stages = [
    { key: 'visitors',         label: 'Visitors',          value: f.visitors },
    { key: 'signup_started',   label: 'Signup Started',    value: f.signup_started },
    { key: 'signup_completed', label: 'Signup Completed',  value: f.signup_completed },
    { key: 'scripts',          label: 'Scripts Generated', value: f.scripts_generated },
    { key: 'exports',          label: 'Exports',           value: f.exports },
    { key: 'published',        label: 'Published',         value: f.published },
  ]
  const top = stages[0].value || 1
  return (
    <div className="rounded-2xl glass border border-gold-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85 inline-flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> Conversion funnel
          </div>
          <div className="text-[10.5px] text-muted-foreground">Visitor \u2192 creator pipeline</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {stages.map((s, i) => {
          const pct = top > 0 ? Math.min(100, Math.round((s.value / top) * 100)) : 0
          const prevValue = i > 0 ? stages[i - 1].value : null
          const dropPct = (prevValue && prevValue > 0) ? Math.round((s.value / prevValue) * 100) : null
          return (
            <div key={s.key} className="group">
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-luxe/85">{s.label}</span>
                <span className="text-luxe font-medium tabular-nums">
                  {s.value.toLocaleString()}
                  {dropPct !== null && i > 0 && (
                    <span className={cn('ml-2 text-[9.5px] tracking-wider', dropPct >= 80 ? 'text-emerald-300/85' : dropPct >= 40 ? 'text-amber-300/85' : 'text-rose-300/85')}>
                      {dropPct}%
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-500 via-amber-400 to-amber-200 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[10px] tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
        <ArrowRight className="w-3 h-3 text-gold-400/70" /> % shown is retention from the previous stage.
      </p>
    </div>
  )
}

const TOP_EVENT_PRIORITY = [
  'visitor_opened_site', 'signup_started', 'signup_completed',
  'pricing_opened', 'agency_demo_clicked',
  'script_generated', 'voice_generated', 'image_generated',
  'export_downloaded', 'export_created', 'published',
]

function TopEventsTable({ counts, lastTriggered, growth }: { counts: Record<string, number>; lastTriggered: Record<string, string>; growth: Record<string, number> }) {
  const rows = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => {
      const ai = TOP_EVENT_PRIORITY.indexOf(a[0])
      const bi = TOP_EVENT_PRIORITY.indexOf(b[0])
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return b[1] - a[1]
    })
    .slice(0, 8)
  return (
    <div className="rounded-2xl glass border border-gold-soft p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85 inline-flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" /> Top events
          </div>
          <div className="text-[10.5px] text-muted-foreground">Most-fired events in window</div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-[12px] text-muted-foreground italic">No events recorded yet.</div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="text-left text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground border-b border-white/[0.05]">
                <th className="font-medium py-2 pl-1 pr-2">Event</th>
                <th className="font-medium py-2 px-2 text-right">Count</th>
                <th className="font-medium py-2 px-2 hidden sm:table-cell">Last</th>
                <th className="font-medium py-2 pl-2 pr-1 text-right">Growth</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([event, count]) => {
                const last = lastTriggered[event]
                const g    = growth[event] ?? 0
                const lastLabel = last ? formatDistanceToNow(parseISO(last), { addSuffix: true }) : '—'
                const gPositive = g >= 0
                const gExtreme  = g >= 999
                return (
                  <tr key={event} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02]">
                    <td className="py-2 pl-1 pr-2 text-luxe/90 truncate max-w-[160px]" title={event}>{prettify(event)}</td>
                    <td className="py-2 px-2 text-right text-luxe tabular-nums">{count.toLocaleString()}</td>
                    <td className="py-2 px-2 text-muted-foreground hidden sm:table-cell whitespace-nowrap">{lastLabel}</td>
                    <td className={cn('py-2 pl-2 pr-1 text-right tabular-nums inline-flex items-center justify-end gap-0.5 w-full',
                      gPositive ? 'text-emerald-300/90' : 'text-rose-300/90'
                    )}>
                      {gPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {gExtreme ? 'NEW' : `${gPositive ? '+' : ''}${g}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PieCard({ title, subtitle, data, empty }: { title: string; subtitle: string; data: { name: string; value: number }[]; empty: string }) {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  return (
    <div className="rounded-2xl glass border border-gold-soft p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85">{title}</div>
          <div className="text-[10.5px] text-muted-foreground">{subtitle}</div>
        </div>
        <div className="text-[10px] tracking-wider text-muted-foreground">{total}</div>
      </div>
      {total === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-[12px] text-muted-foreground italic text-center px-4">{empty}</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={36}
              outerRadius={66}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((_, i) => <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'rgba(20,16,12,0.95)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, fontSize: 11, color: '#E8D9A8' }}
              itemStyle={{ color: '#E8D9A8' }}
            />
            <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: '#a18b56' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function prettify(key: string): string {
  if (!key) return 'Other'
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default MugteeAnalyticsPanel
