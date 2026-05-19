'use client'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { useAutomations } from '@/lib/automations-store'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Send, Calendar, Clapperboard, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/state'

interface Stat {
  key: string
  label: string
  value: string
  delta: string
  icon: any
  accent: string
  href: string
}

export function StatCards() {
  const { content, shoots, loading } = useStore()
  const { queue } = useAutomations()
  const router = useRouter()

  const now = new Date()
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const nowIso = now.toISOString()
  const weekAheadIso = weekAhead.toISOString()
  const todayDate = nowIso.slice(0, 10)
  const weekAheadDate = weekAheadIso.slice(0, 10)

  // 1) Posts scheduled this week — content with publish date in next 7 days
  const scheduledThisWeek = content.filter((c: any) =>
    c.scheduled_at && c.scheduled_at >= nowIso && c.scheduled_at <= weekAheadIso
  ).length

  // 2) Upcoming shoots — shoots in next 7 days OR content.shoot_date in next 7 days
  const upcomingShootsFromTable = shoots.filter((s: any) => s.date && s.date >= todayDate && s.date <= weekAheadDate).length
  const upcomingShootsFromContent = content.filter((c: any) => c.shoot_date && c.shoot_date >= nowIso && c.shoot_date <= weekAheadIso).length
  const upcomingShoots = upcomingShootsFromTable + upcomingShootsFromContent

  // 3) Overdue edits — content.edit_due_date in the past AND status not scheduled/published
  const overdueEdits = content.filter((c: any) =>
    c.edit_due_date && c.edit_due_date < nowIso && !['scheduled','published'].includes(c.status)
  ).length

  // 4) Queued content — queue items in flight (queued, publishing, draft)
  const queuedCount = queue.filter(q => ['queued','publishing','draft'].includes(q.status)).length

  const computed: Stat[] = [
    { key: 'scheduled_week', label: 'Scheduled This Week', value: String(scheduledThisWeek), delta: '7d',  icon: Send,           accent: 'from-gold-500/20 to-gold-700/0',      href: '/calendar' },
    { key: 'upcoming_shoots', label: 'Upcoming Shoots',    value: String(upcomingShoots),    delta: '7d',  icon: Clapperboard,   accent: 'from-amber-400/20 to-amber-700/0',    href: '/shoots' },
    { key: 'overdue_edits',   label: 'Overdue Edits',      value: String(overdueEdits),      delta: overdueEdits > 0 ? '!' : 'ok', icon: AlertTriangle, accent: 'from-rose-400/15 to-rose-700/0', href: '/pipeline?status=editing' },
    { key: 'queued',          label: 'Queued Content',     value: String(queuedCount),       delta: 'live', icon: Calendar,      accent: 'from-emerald-400/15 to-emerald-700/0', href: '/automations' },
  ]

  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<string>('')

  const stats = computed.map(s => ({ ...s, value: overrides[s.key] ?? s.value }))

  const startEdit = (s: Stat) => { setEditing(s.key); setDraft(s.value) }
  const save = () => {
    if (editing && draft) setOverrides(prev => ({ ...prev, [editing]: draft }))
    setEditing(null)
  }

  const isLoading = loading.initial

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((s, i) => {
        const Icon = s.icon
        const isEditing = editing === s.key
        const isAlert = s.key === 'overdue_edits' && parseInt(s.value, 10) > 0
        return (
          <motion.div key={s.key}
            initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:i*0.06, duration:0.5}}
            whileHover={{y:-3}}
            onClick={() => { if (!isEditing) router.push(s.href) }}
            className={cn(
              'group relative rounded-2xl glass overflow-hidden p-5 hover:shadow-cinema transition-shadow cursor-pointer',
              isAlert && 'ring-1 ring-red-500/40',
            )}
          >
            <div className={cn('absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl bg-gradient-to-br opacity-70', s.accent)} />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', isAlert ? 'bg-red-500/15 ring-1 ring-red-500/30' : 'glass-gold')}>
                  <Icon className={cn('w-4 h-4', isAlert ? 'text-red-300' : 'text-gold-300')} />
                </div>
                {!isLoading && (
                  <button onClick={(e) => { e.stopPropagation(); isEditing ? save() : startEdit(s) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-gold-300"
                  >
                    {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1">{s.label}</div>
              {isLoading ? (
                <Skeleton className="h-10 w-20" />
              ) : isEditing ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(null) }}
                    className="h-9 text-2xl font-display bg-transparent border-gold-500/30" />
                  <button onClick={() => setEditing(null)} className="p-1.5 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="font-display text-3xl sm:text-4xl tracking-tight">{s.value}</div>
              )}
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <span className={cn('inline-flex items-center gap-0.5', isAlert ? 'text-red-300' : 'text-emerald-300')}>
                  <ArrowUpRight className="w-3 h-3" /> {s.delta}
                </span>
                <span className="text-muted-foreground">production timeline</span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
