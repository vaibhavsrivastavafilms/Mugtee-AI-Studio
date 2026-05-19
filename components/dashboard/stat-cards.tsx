'use client'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, TrendingUp, Calendar, Film, Users, ArrowUpRight } from 'lucide-react'
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
  const { content, crew, loading } = useStore()
  const router = useRouter()
  const scheduled = content.filter(c => c.status === 'scheduled').length
  const inProduction = content.filter(c => ['scripting','shooting','editing'].includes(c.status as any)).length

  const computed: Stat[] = [
    { key: 'total',        label: 'Total Content Pieces', value: String(content.length),  delta: '+12%', icon: Film,       accent: 'from-gold-500/20 to-gold-700/0',     href: '/pipeline' },
    { key: 'scheduled',    label: 'Scheduled Posts',      value: String(scheduled),       delta: '+4',   icon: Calendar,   accent: 'from-amber-400/20 to-amber-700/0',   href: '/calendar?status=scheduled' },
    { key: 'inproduction', label: 'In Production',        value: String(inProduction),    delta: '+2',   icon: TrendingUp, accent: 'from-rose-400/15 to-rose-700/0',     href: '/pipeline?status=production' },
    { key: 'crew',         label: 'Active Crew',          value: String(crew.length),     delta: 'live',icon: Users,      accent: 'from-emerald-400/15 to-emerald-700/0', href: '/crew' },
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
        return (
          <motion.div key={s.key}
            initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:i*0.06, duration:0.5}}
            whileHover={{y:-3}}
            onClick={() => { if (!isEditing) router.push(s.href) }}
            className="group relative rounded-2xl glass overflow-hidden p-5 hover:shadow-cinema transition-shadow cursor-pointer"
          >
            <div className={cn('absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl bg-gradient-to-br opacity-70', s.accent)} />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg glass-gold flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gold-300" />
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
                <span className="inline-flex items-center gap-0.5 text-emerald-300">
                  <ArrowUpRight className="w-3 h-3" /> {s.delta}
                </span>
                <span className="text-muted-foreground">vs last week</span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
