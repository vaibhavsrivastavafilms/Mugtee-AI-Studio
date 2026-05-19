'use client'
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react'
import { createSupabaseBrowserClient } from './supabase/client'
import { useStore } from './store'
import { toast } from 'sonner'

export type NotificationType = 'info' | 'reminder' | 'content' | 'shoot' | 'publish' | 'workflow' | 'overdue'
export interface Notification {
  id: string; user_id: string; title: string; message?: string | null; type?: NotificationType; link?: string | null; read: boolean; created_at: string
}
export interface QueueItem {
  id: string; user_id: string; content_id?: string | null; platform?: string | null; scheduled_for?: string | null; status: 'draft'|'queued'|'publishing'|'published'|'failed'; retry_count: number; error?: string | null; created_at: string
}
export interface Workflow {
  id: string; user_id: string; title: string; description?: string | null; frequency: 'daily'|'weekly'|'monthly'; next_run?: string | null; enabled: boolean; last_run?: string | null; created_at: string
}

interface AutomationsAPI {
  notifications: Notification[]
  unreadCount: number
  queue: QueueItem[]
  workflows: Workflow[]
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  addWorkflow: (input: Partial<Workflow>) => Promise<void>
  updateWorkflow: (id: string, patch: Partial<Workflow>) => Promise<void>
  removeWorkflow: (id: string) => Promise<void>
  toggleWorkflow: (id: string) => Promise<void>
  enqueue: (input: { content_id?: string | null; platform?: string | null; scheduled_for?: string | null; status?: QueueItem['status'] }) => Promise<void>
  setQueueStatus: (id: string, status: QueueItem['status'], error?: string | null) => Promise<void>
  removeQueueItem: (id: string) => Promise<void>
}

const AutomationsContext = createContext<AutomationsAPI | null>(null)

export function computeNextRun(freq: string, from: Date): string {
  const d = new Date(from)
  if (freq === 'daily') d.setDate(d.getDate() + 1)
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setDate(d.getDate() + 7)
  return d.toISOString()
}

// Terminal states that should not produce overdue notifications
const CONTENT_TERMINAL = new Set(['published'])
const SHOOT_TERMINAL   = new Set(['wrapped'])

export function AutomationsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const { content, shoots } = useStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [queue, setQueue]                 = useState<QueueItem[]>([])
  const [workflows, setWorkflows]         = useState<Workflow[]>([])
  const [loading, setLoading]             = useState(true)

  // Session-local dedupe sets (avoid re-notifying same overdue/auto-enqueue across ticks)
  const overdueSeen = useRef<Set<string>>(new Set())
  const enqueuedSeen = useRef<Set<string>>(new Set())
  const productionSeen = useRef<Set<string>>(new Set())   // script/shoot/edit production-date events

  // ---------- Initial load ----------
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [n, q, w] = await Promise.all([
          supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('publishing_queue').select('*').order('scheduled_for', { ascending: true }),
          supabase.from('recurring_workflows').select('*').order('next_run', { ascending: true }),
        ])
        if (cancelled) return
        const notifs = (n.data as any) || []
        const qItems = (q.data as any) || []
        setNotifications(notifs)
        setQueue(qItems)
        setWorkflows((w.data as any) || [])

        // Hydrate dedupe sets from existing data so reloads don't re-spam
        for (const row of notifs) {
          if (row.link?.startsWith('/pipeline?overdue=')) overdueSeen.current.add('content:' + row.link.split('=')[1])
          if (row.link?.startsWith('/shoots?overdue='))   overdueSeen.current.add('shoot:'   + row.link.split('=')[1])
        }
        for (const qi of qItems) {
          if (qi.content_id) enqueuedSeen.current.add(qi.content_id)
        }
      } catch (e) { console.error('automations load', e) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [supabase])

  // ---------- Realtime subs ----------
  useEffect(() => {
    const filter = `user_id=eq.${userId}`
    const updaters = [
      { table: 'notifications',       set: setNotifications },
      { table: 'publishing_queue',    set: setQueue },
      { table: 'recurring_workflows', set: setWorkflows },
    ]
    const channels = updaters.map(({ table, set }) =>
      supabase.channel(`auto-${table}-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter }, (p: any) => {
          const row = (p.new || p.old) as any
          if (!row) return
          if (p.eventType === 'INSERT') (set as any)((prev: any[]) => prev.find(x => x.id === row.id) ? prev : [row, ...prev])
          else if (p.eventType === 'UPDATE') (set as any)((prev: any[]) => prev.map(x => x.id === row.id ? row : x))
          else if (p.eventType === 'DELETE') (set as any)((prev: any[]) => prev.filter(x => x.id !== row.id))
        })
        .subscribe()
    )
    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  }, [supabase, userId])

  // ---------- notify helper ----------
  const notify = useCallback(async (payload: { title: string; message?: string | null; type?: NotificationType; link?: string | null }) => {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: payload.title,
        message: payload.message ?? null,
        type: payload.type ?? 'info',
        link: payload.link ?? null,
      })
    } catch (e) { console.error('notify', e) }
  }, [supabase, userId])

  // ---------- Reminder + Workflow + Overdue + Queue lifecycle tick (every 60s) ----------
  useEffect(() => {
    let stopped = false
    const tick = async () => {
      if (stopped) return
      const now = new Date()
      const nowIso = now.toISOString()
      const today = nowIso.slice(0, 10)

      try {
        // 1. REMINDERS — content
        const dueContent = content.filter((c: any) => c.reminder_at && !c.reminder_sent && c.reminder_at <= nowIso)
        for (const c of dueContent) {
          await notify({ title: 'Reminder', message: `Time to work on “${c.title}”`, type: 'reminder', link: '/pipeline' })
          await supabase.from('content_pieces').update({ reminder_sent: true }).eq('id', c.id)
        }
        // 2. REMINDERS — shoots
        const dueShoots = shoots.filter((s: any) => s.reminder_at && !s.reminder_sent && s.reminder_at <= nowIso)
        for (const s of dueShoots) {
          await notify({ title: 'Shoot reminder', message: `“${s.title}” is coming up`, type: 'reminder', link: '/shoots' })
          await supabase.from('shoots').update({ reminder_sent: true }).eq('id', s.id)
        }

        // 3. RECURRING WORKFLOWS
        const dueWfs = workflows.filter(w => w.enabled && w.next_run && w.next_run <= nowIso)
        for (const w of dueWfs) {
          await notify({ title: w.title, message: w.description || 'Recurring workflow triggered', type: 'workflow', link: '/automations' })
          const next = computeNextRun(w.frequency, new Date())
          await supabase.from('recurring_workflows').update({ next_run: next, last_run: nowIso }).eq('id', w.id)
        }

        // 4. OVERDUE CONTENT — scheduled_at in the past, status not terminal
        for (const c of content as any[]) {
          if (!c.scheduled_at || c.scheduled_at > nowIso) continue
          if (CONTENT_TERMINAL.has(c.status)) continue
          const key = 'content:' + c.id
          if (overdueSeen.current.has(key)) continue
          overdueSeen.current.add(key)
          await notify({ title: 'Content overdue', message: `“${c.title}” was scheduled for ${new Date(c.scheduled_at).toLocaleString()}`, type: 'overdue', link: '/pipeline?overdue=' + c.id })
        }
        // 5. OVERDUE SHOOTS — date before today, status not wrapped
        for (const s of shoots as any[]) {
          if (!s.date || s.date >= today) continue
          if (SHOOT_TERMINAL.has(s.status || '')) continue
          const key = 'shoot:' + s.id
          if (overdueSeen.current.has(key)) continue
          overdueSeen.current.add(key)
          await notify({ title: 'Shoot overdue', message: `“${s.title}” was set for ${s.date}`, type: 'overdue', link: '/shoots?overdue=' + s.id })
        }

        // 5b. PRODUCTION TIMELINE EVENTS — script_due / shoot_date / edit_due per content piece
        // Fire once-per-session per content per stage. Reminder window: within next 60 min → upcoming. After → overdue.
        const stages: { field: 'script_due_date' | 'shoot_date' | 'edit_due_date'; label: string; terminal: (status: string) => boolean }[] = [
          { field: 'script_due_date', label: 'Script',  terminal: (s) => ['shooting','editing','scheduled','published'].includes(s) },
          { field: 'shoot_date',      label: 'Shoot',   terminal: (s) => ['editing','scheduled','published'].includes(s) },
          { field: 'edit_due_date',   label: 'Edit',    terminal: (s) => ['scheduled','published'].includes(s) },
        ]
        for (const c of content as any[]) {
          for (const stage of stages) {
            const when = c[stage.field]
            if (!when) continue
            if (stage.terminal(c.status || '')) continue
            const t = new Date(when).getTime()
            const diff = t - now.getTime()
            if (diff > 60 * 60 * 1000) continue   // not yet within the next hour
            const overdue = diff < 0
            const key = `prod:${stage.field}:${overdue ? 'over' : 'up'}:${c.id}`
            if (productionSeen.current.has(key)) continue
            productionSeen.current.add(key)
            await notify({
              title: overdue ? `${stage.label} overdue` : `${stage.label} due soon`,
              message: `“${c.title}” — ${new Date(when).toLocaleString()}`,
              type: overdue ? 'overdue' : 'reminder',
              link: '/pipeline',
            })
          }
        }

        // 6. AUTO-ENQUEUE — content with scheduled_at + status 'scheduled' + not already queued
        for (const c of content as any[]) {
          if (!c.scheduled_at) continue
          if (c.status !== 'scheduled') continue
          if (enqueuedSeen.current.has(c.id)) continue
          enqueuedSeen.current.add(c.id)
          const { data, error } = await supabase.from('publishing_queue').insert({
            user_id: userId, content_id: c.id, platform: c.platform, scheduled_for: c.scheduled_at, status: 'queued',
          }).select().single()
          if (!error && data) {
            await notify({ title: 'Queued for publishing', message: `“${c.title}” → ${c.platform}`, type: 'publish', link: '/automations' })
          }
        }

        // 7. QUEUE LIFECYCLE — queued whose time arrived → publishing; publishing older than 60s → published
        for (const q of queue) {
          if (q.status === 'queued' && q.scheduled_for && q.scheduled_for <= nowIso) {
            await supabase.from('publishing_queue').update({ status: 'publishing' }).eq('id', q.id)
            const title = content.find(c => c.id === q.content_id)?.title || q.platform || 'content'
            await notify({ title: 'Publishing now', message: `${title} → ${q.platform || 'platform'}`, type: 'publish', link: '/automations' })
          } else if (q.status === 'publishing') {
            const created = new Date(q.created_at).getTime()
            const startedAt = q.scheduled_for ? Math.max(created, new Date(q.scheduled_for).getTime()) : created
            if (now.getTime() - startedAt >= 60_000) {
              await supabase.from('publishing_queue').update({ status: 'published' }).eq('id', q.id)
              const title = content.find(c => c.id === q.content_id)?.title || q.platform || 'content'
              await notify({ title: 'Published', message: `${title} is live on ${q.platform || 'platform'}`, type: 'publish', link: '/automations' })
              // Also flip the content piece status to published when its queue item completes
              if (q.content_id) {
                await supabase.from('content_pieces').update({ status: 'published' }).eq('id', q.content_id)
              }
            }
          }
        }
      } catch (e) { console.error('automations tick', e) }
    }
    tick()
    const i = setInterval(tick, 60_000)
    return () => { stopped = true; clearInterval(i) }
  }, [supabase, userId, content, shoots, workflows, queue, notify])

  // ---------- Notification CRUD ----------
  const markAsRead = useCallback(async (id: string) => {
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }, [supabase])

  const markAllRead = useCallback(async () => {
    setNotifications(n => n.map(x => ({ ...x, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  }, [supabase, userId])

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(n => n.filter(x => x.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }, [supabase])

  // ---------- Workflow CRUD ----------
  const addWorkflow = useCallback(async (input: Partial<Workflow>) => {
    const freq = (input.frequency || 'weekly') as Workflow['frequency']
    const next = input.next_run || computeNextRun(freq, new Date())
    const { data, error } = await supabase.from('recurring_workflows').insert({
      user_id: userId,
      title: input.title || 'Workflow',
      description: input.description ?? null,
      frequency: freq,
      next_run: next,
      enabled: input.enabled ?? true,
    }).select().single()
    if (error) { toast.error(error.message); return }
    if (data) setWorkflows(prev => prev.find(x => x.id === (data as any).id) ? prev : [(data as any), ...prev])
  }, [supabase, userId])

  const updateWorkflow = useCallback(async (id: string, patch: Partial<Workflow>) => {
    const before = workflows
    setWorkflows(w => w.map(x => x.id === id ? { ...x, ...patch } : x))
    const { error } = await supabase.from('recurring_workflows').update(patch).eq('id', id)
    if (error) { setWorkflows(before); toast.error(error.message) }
  }, [supabase, workflows])

  const removeWorkflow = useCallback(async (id: string) => {
    setWorkflows(w => w.filter(x => x.id !== id))
    await supabase.from('recurring_workflows').delete().eq('id', id)
  }, [supabase])

  const toggleWorkflow = useCallback(async (id: string) => {
    const wf = workflows.find(x => x.id === id)
    if (!wf) return
    await updateWorkflow(id, { enabled: !wf.enabled })
  }, [workflows, updateWorkflow])

  // ---------- Publishing Queue CRUD ----------
  const enqueue = useCallback(async (input: { content_id?: string | null; platform?: string | null; scheduled_for?: string | null; status?: QueueItem['status'] }) => {
    const { data, error } = await supabase.from('publishing_queue').insert({
      user_id: userId,
      content_id: input.content_id ?? null,
      platform: input.platform ?? null,
      scheduled_for: input.scheduled_for ?? null,
      status: input.status ?? 'queued',
    }).select().single()
    if (error) { toast.error(error.message); return }
    if (input.content_id) enqueuedSeen.current.add(input.content_id)
    if (data) {
      const title = content.find(c => c.id === input.content_id)?.title || input.platform || 'content'
      await notify({ title: 'Queued for publishing', message: `${title} → ${input.platform || 'platform'}`, type: 'publish', link: '/automations' })
    }
  }, [supabase, userId, content, notify])

  const setQueueStatus = useCallback(async (id: string, status: QueueItem['status'], error?: string | null) => {
    const before = queue
    setQueue(q => q.map(x => x.id === id ? { ...x, status, error: error ?? x.error } : x))
    const patch: any = { status }
    if (error !== undefined) patch.error = error
    const { error: dbErr } = await supabase.from('publishing_queue').update(patch).eq('id', id)
    if (dbErr) { setQueue(before); toast.error(dbErr.message); return }
    const item = before.find(x => x.id === id)
    const title = (item?.content_id ? content.find(c => c.id === item.content_id)?.title : null) || item?.platform || 'item'
    const labels: Record<string, string> = {
      draft: 'Queue draft saved',
      queued: 'Queued for publishing',
      publishing: 'Publishing now',
      published: 'Published',
      failed: 'Publish failed',
    }
    await notify({ title: labels[status] || 'Queue updated', message: `${title}${error ? ` — ${error}` : ''}`, type: 'publish', link: '/automations' })
    if (status === 'published' && item?.content_id) {
      await supabase.from('content_pieces').update({ status: 'published' }).eq('id', item.content_id)
    }
  }, [supabase, queue, content, notify])

  const removeQueueItem = useCallback(async (id: string) => {
    setQueue(q => q.filter(x => x.id !== id))
    await supabase.from('publishing_queue').delete().eq('id', id)
  }, [supabase])

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  const value: AutomationsAPI = {
    notifications, unreadCount, queue, workflows, loading,
    markAsRead, markAllRead, deleteNotification,
    addWorkflow, updateWorkflow, removeWorkflow, toggleWorkflow,
    enqueue, setQueueStatus, removeQueueItem,
  }
  return <AutomationsContext.Provider value={value}>{children}</AutomationsContext.Provider>
}

export function useAutomations() {
  const ctx = useContext(AutomationsContext)
  if (!ctx) throw new Error('useAutomations requires AutomationsProvider')
  return ctx
}
