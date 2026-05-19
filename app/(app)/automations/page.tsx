'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Plus, Power, Trash2, Calendar, Bell, Repeat, ChevronDown, MoreVertical } from 'lucide-react'
import { useAutomations, type Workflow, type QueueItem, computeNextRun } from '@/lib/automations-store'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton, EmptyState } from '@/components/ui/state'
import { useConfirm } from '@/components/ui/confirm'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

export default function AutomationsPage() {
  const { workflows, queue, notifications, loading, addWorkflow, updateWorkflow, removeWorkflow, toggleWorkflow, setQueueStatus, removeQueueItem } = useAutomations()
  const { content, shoots } = useStore()
  const confirm = useConfirm()
  const [creating, setCreating] = useState(false)

  const upcomingReminders = [
    ...content.filter((c: any) => c.reminder_at && !c.reminder_sent).map((c: any) => ({ id: c.id, kind: 'content', title: c.title, at: c.reminder_at })),
    ...shoots.filter((s: any) => s.reminder_at && !s.reminder_sent).map((s: any) => ({ id: s.id, kind: 'shoot', title: s.title, at: s.reminder_at })),
  ].sort((a, b) => (a.at as string).localeCompare(b.at as string)).slice(0, 8)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Automations</div>
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">Recurring</span> rituals</h1>
          <p className="text-luxe/70 mt-2">Set up reminders, planning rhythms, and publishing queues.</p>
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button className="h-10 bg-gold-gradient text-black gap-2 shadow-gold-glow"><Plus className="w-4 h-4" /> New automation</Button>
          </DialogTrigger>
          <WorkflowDialog onSubmit={async (data) => { await addWorkflow(data); setCreating(false) }} />
        </Dialog>
      </motion.div>

      {/* Workflows */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1"><Repeat className="w-4 h-4 text-gold-400" />
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">Recurring Workflows</div>
        </div>
        <h2 className="font-display text-2xl mb-5">Your rituals</h2>
        {loading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
        ) : workflows.length === 0 ? (
          <EmptyState icon={Zap} title="No automations yet"
            description="Add weekly content reviews, Monday planning, or daily posting checklists."
            action={<Button onClick={() => setCreating(true)} className="bg-gold-gradient text-black"><Plus className="w-4 h-4 mr-1" /> Add automation</Button>} />
        ) : (
          <div className="space-y-2">
            {workflows.map(w => (
              <WorkflowRow key={w.id} workflow={w}
                onToggle={() => toggleWorkflow(w.id)}
                onRunNow={() => updateWorkflow(w.id, { next_run: new Date().toISOString() })}
                onDelete={async () => { if (await confirm({ title: `Delete “${w.title}”?`, destructive: true })) removeWorkflow(w.id) }} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Upcoming reminders */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.05}} className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1"><Bell className="w-4 h-4 text-gold-400" />
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">Upcoming Reminders</div>
        </div>
        <h2 className="font-display text-2xl mb-5">What’s ringing next</h2>
        {upcomingReminders.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No upcoming reminders. Set reminder dates on content or shoots.</div>
        ) : (
          <div className="space-y-2">
            {upcomingReminders.map(r => (
              <div key={`${r.kind}-${r.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg glass-gold flex items-center justify-center shrink-0"><Calendar className="w-4 h-4 text-gold-300" /></div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground">{r.kind} · {format(parseISO(r.at), 'EEE, MMM d · HH:mm')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Publishing queue */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1"><ChevronDown className="w-4 h-4 text-gold-400" />
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">Publishing Queue</div>
        </div>
        <h2 className="font-display text-2xl mb-1">Scheduled to publish</h2>
        <p className="text-luxe/70 text-sm mb-5">Foundation only — platform publishing connects in a future phase.</p>
        {queue.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Queue is empty. Set content status to “scheduled” with a date and it auto-enqueues.</div>
        ) : (
          <div className="space-y-2">
            {queue.map(q => {
              const title = (q.content_id ? content.find(c => c.id === q.content_id)?.title : null) || q.platform || 'Untitled'
              const NEXT: Record<QueueItem['status'], QueueItem['status'] | null> = {
                draft: 'queued', queued: 'publishing', publishing: 'published', published: null, failed: 'queued',
              }
              const next = NEXT[q.status]
              const scheduledMs = q.scheduled_for ? new Date(q.scheduled_for).getTime() : null
              const nowMs = Date.now()
              const isOverdue = scheduledMs !== null && scheduledMs < nowMs && (q.status === 'queued' || q.status === 'draft')
              const countdown = scheduledMs !== null && scheduledMs > nowMs ? formatCountdown(scheduledMs - nowMs) : null
              return (
                <div key={q.id} className={cn(
                  'flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border transition',
                  isOverdue ? 'border-red-500/40 bg-red-500/[0.04]' : 'border-white/[0.05]',
                )}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{title} <span className="text-muted-foreground">· {q.platform || 'unknown'}</span></div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>{q.scheduled_for ? format(parseISO(q.scheduled_for), 'EEE, MMM d · HH:mm') : 'No schedule'}</span>
                      {countdown && <span className="text-gold-300">· in {countdown}</span>}
                      {isOverdue && <span className="text-red-300 font-medium">· OVERDUE</span>}
                      {q.error && <span>· {q.error}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn('text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full transition hover:opacity-80',
                          q.status === 'published' ? 'bg-emerald-500/15 text-emerald-300' :
                          q.status === 'failed' ? 'bg-red-500/15 text-red-300' :
                          q.status === 'publishing' ? 'bg-gold-500/15 text-gold-300 animate-pulse' :
                          q.status === 'queued' ? 'bg-sky-500/15 text-sky-300' :
                          'bg-zinc-500/15 text-zinc-300')}>
                          {q.status}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-strong">
                        <DropdownMenuLabel className="text-[10px] tracking-widest uppercase text-muted-foreground">Set status</DropdownMenuLabel>
                        {(['draft','queued','publishing','published','failed'] as QueueItem['status'][]).map(s => (
                          <DropdownMenuItem key={s} disabled={s === q.status} onClick={() => setQueueStatus(q.id, s)} className="capitalize">{s}</DropdownMenuItem>
                        ))}
                        {next && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setQueueStatus(q.id, next)} className="text-gold-300 focus:text-gold-200 capitalize">→ Advance to {next}</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="ghost" onClick={() => removeQueueItem(q.id)} className="text-muted-foreground hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}

function WorkflowRow({ workflow, onToggle, onRunNow, onDelete }: { workflow: Workflow; onToggle: () => void; onRunNow: () => void; onDelete: () => void }) {
  return (
    <div className={cn('flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border transition',
      workflow.enabled ? 'border-white/[0.06]' : 'border-white/[0.03] opacity-60')}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-gold-gradient flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-black" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{workflow.title}</div>
          <div className="text-[11px] text-muted-foreground">
            {workflow.frequency} · next run {workflow.next_run ? format(parseISO(workflow.next_run), 'EEE, MMM d · HH:mm') : 'never'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={workflow.enabled} onCheckedChange={onToggle} />
        <Button size="sm" variant="ghost" onClick={onRunNow} className="text-muted-foreground hover:text-gold-300 hidden sm:inline-flex"><Power className="w-3.5 h-3.5 mr-1" />Run now</Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-300 hover:text-red-200 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  )
}

function WorkflowDialog({ onSubmit }: { onSubmit: (data: Partial<Workflow>) => void | Promise<void> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<'daily'|'weekly'|'monthly'>('weekly')
  const next = computeNextRun(frequency, new Date())
  return (
    <DialogContent className="glass-strong sm:max-w-md">
      <DialogHeader><DialogTitle className="font-display text-2xl">New automation</DialogTitle></DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Title</label>
          <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Weekly content review" className="bg-white/[0.03]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Description</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Review the past week & plan next…" className="bg-white/[0.03]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Frequency</label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
            <SelectTrigger className="bg-white/[0.03]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">First trigger: {format(parseISO(next), 'EEE, MMM d · HH:mm')}</p>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ title: title.trim() || 'Workflow', description: description.trim() || null, frequency, enabled: true })}
          className="bg-gold-gradient text-black">Create</Button>
      </DialogFooter>
    </DialogContent>
  )
}
