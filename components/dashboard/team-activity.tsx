'use client'
import { useStore } from '@/lib/store'
import { useAutomations } from '@/lib/automations-store'
import { motion } from 'framer-motion'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/state'
import { Bell, Zap, Send, AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

type FeedItem = {
  id: string
  kind: 'activity' | 'system'
  actor?: string | null
  action?: string | null
  target?: string | null
  title?: string | null
  message?: string | null
  type?: string | null
  created_at: string
}

const TYPE_ICON: Record<string, any> = {
  reminder: Bell,
  workflow: Zap,
  publish: Send,
  overdue: AlertTriangle,
  content: Sparkles,
  shoot: Sparkles,
  info: Bell,
}

export function TeamActivity() {
  const { activity, loading } = useStore()
  const { notifications } = useAutomations()

  const feed: FeedItem[] = useMemo(() => {
    const a: FeedItem[] = (activity || []).map((x: any) => ({
      id: 'a-' + x.id, kind: 'activity', actor: x.actor, action: x.action, target: x.target, created_at: x.created_at,
    }))
    const n: FeedItem[] = (notifications || []).slice(0, 30).map((x: any) => ({
      id: 'n-' + x.id, kind: 'system', title: x.title, message: x.message, type: x.type, created_at: x.created_at,
    }))
    return [...a, ...n].sort((p, q) => (q.created_at || '').localeCompare(p.created_at || '')).slice(0, 40)
  }, [activity, notifications])

  return (
    <motion.div initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:0.1}}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Team & Automation Activity</div>
          <h3 className="font-display text-2xl mt-1">Live pulse</h3>
        </div>
        <span className="text-[10px] tracking-widest uppercase text-emerald-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </span>
      </div>
      {loading.activity ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : feed.length === 0 ? (
        <div className="text-center py-8 text-luxe/60 text-sm">No activity yet.</div>
      ) : (
        <div className="space-y-3 max-h-[340px] overflow-y-auto scrollbar-luxe pr-2">
          {feed.map(item => {
            const when = item.created_at ? formatDistanceToNow(parseISO(item.created_at), { addSuffix: true }) : ''
            if (item.kind === 'activity') {
              const initials = (item.actor || '?').split(' ').map(x=>x[0]).join('').slice(0,2)
              return (
                <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition">
                  <Avatar className="w-9 h-9 ring-1 ring-gold-500/30">
                    <AvatarFallback className="text-xs bg-gold-gradient text-black">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-snug">
                      <span className="font-medium">{item.actor}</span>{' '}
                      <span className="text-muted-foreground">{item.action}</span>{' '}
                      <span className="text-gold-300">{item.target}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{when}</div>
                  </div>
                </div>
              )
            }
            const Icon = TYPE_ICON[item.type || 'info'] || Bell
            const overdue = item.type === 'overdue'
            return (
              <div key={item.id} className={cn('flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition border',
                overdue ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-transparent')}>
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ring-1',
                  overdue ? 'bg-red-500/15 ring-red-500/30 text-red-300' : 'glass-gold ring-gold-500/30 text-gold-300')}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-snug">
                    <span className="font-medium">{item.title}</span>
                    {item.message && <span className="text-muted-foreground"> · {item.message}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{when}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
