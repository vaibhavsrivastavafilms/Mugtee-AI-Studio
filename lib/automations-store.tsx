'use client'
import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { createSupabaseBrowserClient } from './supabase/client'
import { useStore } from './store'
import { toast } from 'sonner'

export type NotificationType = 'info' | 'reminder' | 'content' | 'shoot' | 'publish' | 'workflow'
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
}

const AutomationsContext = createContext<AutomationsAPI | null>(null)

export function computeNextRun(freq: string, from: Date): string {
  const d = new Date(from)
  if (freq === 'daily') d.setDate(d.getDate() + 1)
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setDate(d.getDate() + 7)
  return d.toISOString()
}

export function AutomationsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const { content, shoots } = useStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [queue, setQueue]                 = useState<QueueItem[]>([])
  const [workflows, setWorkflows]         = useState<Workflow[]>([])
  const [loading, setLoading]             = useState(true)

  // Initial load
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
        setNotifications((n.data as any) || [])
        setQueue((q.data as any) || [])
        setWorkflows((w.data as any) || [])
      } catch (e) { console.error('automations load', e) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [supabase])

  // Realtime subs
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

  // Reminder + Workflow polling (every 60s, plus once on mount)
  useEffect(() => {
    let stopped = false
    const tick = async () => {
      if (stopped) return
      const now = new Date().toISOString()
      try {
        const dueContent = content.filter((c: any) => c.reminder_at && !c.reminder_sent && c.reminder_at <= now)
        const dueShoots  = shoots.filter((s: any)  => s.reminder_at && !s.reminder_sent && s.reminder_at <= now)
        for (const c of dueContent) {
          await supabase.from('notifications').insert({ user_id: userId, title: 'Reminder', message: `Time to work on “${c.title}”`, type: 'reminder', link: '/pipeline' })
          await supabase.from('content_pieces').update({ reminder_sent: true }).eq('id', c.id)
        }
        for (const s of dueShoots) {
          await supabase.from('notifications').insert({ user_id: userId, title: 'Shoot reminder', message: `“${s.title}” is coming up`, type: 'reminder', link: '/shoots' })
          await supabase.from('shoots').update({ reminder_sent: true }).eq('id', s.id)
        }
        const dueWfs = workflows.filter(w => w.enabled && w.next_run && w.next_run <= now)
        for (const w of dueWfs) {
          await supabase.from('notifications').insert({ user_id: userId, title: w.title, message: w.description || 'Recurring workflow triggered', type: 'workflow', link: '/automations' })
          const next = computeNextRun(w.frequency, new Date())
          await supabase.from('recurring_workflows').update({ next_run: next, last_run: now }).eq('id', w.id)
        }
      } catch (e) { console.error('automations tick', e) }
    }
    tick()
    const i = setInterval(tick, 60_000)
    return () => { stopped = true; clearInterval(i) }
  }, [supabase, userId, content, shoots, workflows])

  // CRUD
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

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  const value: AutomationsAPI = { notifications, unreadCount, queue, workflows, loading, markAsRead, markAllRead, deleteNotification, addWorkflow, updateWorkflow, removeWorkflow, toggleWorkflow }
  return <AutomationsContext.Provider value={value}>{children}</AutomationsContext.Provider>
}

export function useAutomations() {
  const ctx = useContext(AutomationsContext)
  if (!ctx) throw new Error('useAutomations requires AutomationsProvider')
  return ctx
}
