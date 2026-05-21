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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { BarChart3, FileText, Volume2, Image as ImgIcon, Users, TrendingUp, Loader2, Lock, Eye, Crown } from 'lucide-react'
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
    </motion.section>
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
