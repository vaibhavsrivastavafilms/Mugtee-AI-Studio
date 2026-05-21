'use client'
// MUGTEE V3.2 — Live Pulse (clickable production command center).
//
// Activity + notification feed where EVERY item is now navigational:
//   • Activity items resolve to a project workspace by matching `target` text
//     against current content_pieces. If matched → /script/{id}. Otherwise → /pipeline.
//   • Notification items use their existing `link` field directly.
// Hover glow, cursor pointer, tap feedback. Cinematic.
//
// EXTREME LOW CREDIT MODE: zero new deps. Reuses existing stores.

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { useAutomations } from '@/lib/automations-store'
import { motion } from 'framer-motion'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/state'
import { Bell, Zap, Send, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type FeedItem = {
  id: string
  kind: 'activity' | 'system'
  actor?: string | null
  action?: string | null
  target?: string | null
  // V3.5 — typed event taxonomy + optional metadata (lets us render production-aware icons)
  event_type?: string | null
  metadata?: Record<string, any> | null
  project_id?: string | null
  title?: string | null
  message?: string | null
  type?: string | null
  link?: string | null
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

// V3.5 — Mapping event_type → cinematic verb. Drives the Live Pulse narrative so it
// reads like a production log ("Generated cinematic narration") instead of a flat verb.
const EVENT_VERB: Record<string, string> = {
  project_opened:         'opened',
  script_generated:       'generated cinematic script for',
  rewrite_applied:        'rewrote a section of',
  narration_extracted:    'extracted narration for',
  flow_prompts_generated: 'created visual storyboard for',
  image_generated:        'generated storyboard images for',
  voiceover_generated:    'generated voiceover for',
  export_created:         'exported',
  regeneration_used:      'regenerated',
  content_created:        'created',
  content_updated:        'updated',
}

// Heuristic — translate the action verb to the most relevant project workspace
// hash so clicking a "Generated images" pulse item lands the user near the rail.
function deriveHash(action: string | null | undefined, target?: string | null): string {
  const t = (action || '') + ' ' + (target || '')
  const s = t.toLowerCase()
  if (/(image|storyboard|b-?roll|thumbnail)/.test(s)) return '#assets'
  if (/(voiceover|narration|tts|voice)/.test(s))      return '#assets'
  if (/(rewrite|edit|script)/.test(s))                return ''
  if (/(export|docx|download)/.test(s))               return '#assets'
  return ''
}

export function TeamActivity() {
  const router = useRouter()
  const { activity, content, loading } = useStore()
  const { notifications } = useAutomations()

  // Build a lookup so we can resolve activity `target` (project title) → project id.
  const titleToId = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of content || []) {
      if (c?.title) m.set(c.title.toLowerCase().trim(), c.id)
    }
    return m
  }, [content])

  const feed: FeedItem[] = useMemo(() => {
    const a: FeedItem[] = (activity || []).map((x: any) => ({
      id: 'a-' + x.id, kind: 'activity', actor: x.actor, action: x.action, target: x.target,
      event_type: x.event_type, metadata: x.metadata, project_id: x.project_id, created_at: x.created_at,
    }))
    const n: FeedItem[] = (notifications || []).slice(0, 30).map((x: any) => ({
      id: 'n-' + x.id, kind: 'system', title: x.title, message: x.message, type: x.type, link: x.link, created_at: x.created_at,
    }))
    return [...a, ...n].sort((p, q) => (q.created_at || '').localeCompare(p.created_at || '')).slice(0, 40)
  }, [activity, notifications])

  const resolveActivityLink = (item: FeedItem): string => {
    // V3.5 — Prefer the explicit project_id (set by new typed events) — way more
    // reliable than the legacy fuzzy title match.
    if (item.project_id && content?.some((c: any) => c.id === item.project_id)) {
      return `/script/${item.project_id}${deriveHash(item.action, item.target)}`
    }
    const targetKey = (item.target || '').toLowerCase().trim()
    if (targetKey && titleToId.has(targetKey)) {
      return `/script/${titleToId.get(targetKey)}${deriveHash(item.action, item.target)}`
    }
    // Try a fuzzy substring match for renamed or partial targets.
    if (targetKey) {
      for (const [k, id] of titleToId) {
        if (k.includes(targetKey) || targetKey.includes(k)) return `/script/${id}${deriveHash(item.action, item.target)}`
      }
    }
    // Fallback: send to the pipeline so they at least see all projects.
    return '/pipeline'
  }

  const openItem = (item: FeedItem) => {
    const href = item.kind === 'activity'
      ? resolveActivityLink(item)
      : (item.link && typeof item.link === 'string' ? item.link : '/pipeline')
    router.push(href)
  }

  return (
    <motion.div initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:0.1}}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-400/80">Production Command Center</div>
          <h3 className="font-display text-2xl mt-1">Live pulse</h3>
        </div>
        <span className="text-[10px] tracking-widest uppercase text-emerald-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </span>
      </div>
      {loading.activity ? (
        <div className="space-y-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : feed.length === 0 ? (
        <div className="text-center py-8 text-luxe/60 text-sm">No activity yet — your first generation will show up here, live.</div>
      ) : (
        <div className="space-y-2 max-h-[340px] overflow-y-auto scrollbar-luxe pr-1.5">
          {feed.map(item => {
            const when = item.created_at ? formatDistanceToNow(parseISO(item.created_at), { addSuffix: true }) : ''
            if (item.kind === 'activity') {
              const initials = (item.actor || '?').split(' ').map(x=>x[0]).join('').slice(0,2)
              // V3.5 — Prefer cinematic verb derived from event_type. Falls back to
              // the raw `action` string for legacy events without a typed event_type.
              const verb = (item.event_type && EVENT_VERB[item.event_type]) || item.action || ''
              return (
                <button
                  key={item.id}
                  onClick={() => openItem(item)}
                  className="group w-full text-left flex items-start gap-3 p-2.5 rounded-xl hover:bg-gold-500/[0.06] hover:border-gold-500/30 active:bg-gold-500/[0.1] border border-transparent transition cursor-pointer min-h-[56px]"
                >
                  <Avatar className="w-9 h-9 ring-1 ring-gold-500/30 shrink-0">
                    <AvatarFallback className="text-xs bg-gold-gradient text-black">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-snug">
                      <span className="font-medium">{item.actor}</span>{' '}
                      <span className="text-muted-foreground">{verb}</span>{' '}
                      <span className="text-gold-300">{item.target}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{when}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold-300 group-hover:translate-x-0.5 transition shrink-0 mt-2" />
                </button>
              )
            }
            const Icon = TYPE_ICON[item.type || 'info'] || Bell
            const overdue = item.type === 'overdue'
            return (
              <button
                key={item.id}
                onClick={() => openItem(item)}
                className={cn(
                  'group w-full text-left flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer min-h-[56px]',
                  overdue
                    ? 'border-red-500/25 bg-red-500/[0.04] hover:bg-red-500/[0.08] hover:border-red-500/40 active:bg-red-500/[0.12]'
                    : 'border-transparent hover:bg-gold-500/[0.06] hover:border-gold-500/30 active:bg-gold-500/[0.1]',
                )}
              >
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
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold-300 group-hover:translate-x-0.5 transition shrink-0 mt-2" />
              </button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
