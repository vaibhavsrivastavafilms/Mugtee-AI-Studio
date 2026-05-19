'use client'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLATFORM_META, STATUS_META } from '@/lib/dummy-data'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirm } from '@/components/ui/confirm'
import type { ContentPiece, Platform } from '@/lib/types'

export default function CalendarPage() {
  const { content, addContent, updateContent, removeContent } = useStore()
  const confirm = useConfirm()
  const [cursor, setCursor] = useState(new Date())
  const [creating, setCreating] = useState<{date: Date | null, open: boolean}>({date:null, open:false})
  const [editing, setEditing] = useState<ContentPiece | null>(null)

  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })
  const scheduled = content.filter(c => c.scheduled_at)

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Content Calendar</div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">{format(cursor, 'MMMM')}</span> {format(cursor, 'yyyy')}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(subMonths(cursor, 1))} className="p-2 rounded-lg glass"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCursor(new Date())} className="px-3 py-2 text-xs rounded-lg glass">Today</button>
            <button onClick={() => setCursor(addMonths(cursor, 1))} className="p-2 rounded-lg glass"><ChevronRight className="w-4 h-4" /></button>
            <Dialog open={creating.open} onOpenChange={(o) => setCreating(s => ({...s, open:o}))}>
              <DialogTrigger asChild>
                <Button className="ml-2 h-9 bg-gold-gradient text-black gap-2 shadow-gold-glow"><Plus className="w-4 h-4" /> New Post</Button>
              </DialogTrigger>
              <CreateOrEditDialog
                initial={creating.date ? { scheduled_at: creating.date.toISOString() } : undefined}
                onSubmit={(item) => { addContent({ ...item, id: 'p'+Date.now() }); setCreating({date:null, open:false}) }}
              />
            </Dialog>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}
        className="glass rounded-2xl p-3 sm:p-5"
      >
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-[10px] sm:text-xs tracking-[0.2em] uppercase text-muted-foreground text-center pb-2">{d}</div>
          ))}
          {days.map(day => {
            const items = scheduled.filter(c => isSameDay(parseISO(c.scheduled_at!), day))
            const inMonth = isSameMonth(day, cursor)
            const today = isSameDay(day, new Date())
            return (
              <div key={day.toISOString()}
                className={cn(
                  'group relative min-h-[110px] sm:min-h-[140px] rounded-xl p-2 sm:p-2.5 transition-all cursor-pointer hover:bg-white/[0.04]',
                  inMonth ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-transparent border border-transparent opacity-40',
                  today && 'ring-1 ring-gold-500/60 bg-gold-500/[0.06]'
                )}
                onClick={() => { setCreating({date: day, open: true}) }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={cn('text-xs sm:text-sm font-medium', today ? 'text-gold-300' : 'text-foreground')}>{format(day, 'd')}</div>
                  <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 text-gold-300" />
                </div>
                <div className="space-y-1">
                  {items.map(i => (
                    <button key={i.id} onClick={(e) => { e.stopPropagation(); setEditing(i) }}
                      className="w-full text-left px-2 py-1.5 rounded-md bg-gradient-to-r from-gold-500/15 to-transparent border border-gold-500/25 hover:border-gold-500/50 transition"
                    >
                      <div className="text-[10px] truncate font-medium">{i.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-[9px] uppercase tracking-wider', PLATFORM_META[i.platform].color)}>{PLATFORM_META[i.platform].label}</span>
                        <span className="text-[9px] text-muted-foreground">{format(parseISO(i.scheduled_at!), 'HH:mm')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <CreateOrEditDialog
            initial={editing}
            onSubmit={(item) => { updateContent(editing.id, item); setEditing(null) }}
            onDelete={async () => {
              if (await confirm({ title: `Delete "${editing.title}"?`, description: 'This scheduled post will be removed from your calendar.', destructive: true })) {
                removeContent(editing.id)
                setEditing(null)
              }
            }}
          />
        )}
      </Dialog>
    </div>
  )
}

function CreateOrEditDialog({ initial, onSubmit, onDelete }: { initial?: Partial<ContentPiece>; onSubmit: (item: ContentPiece) => void; onDelete?: () => void }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [platform, setPlatform] = useState<Platform>((initial?.platform as Platform) || 'instagram')
  const [status, setStatus] = useState((initial?.status as any) || 'scheduled')
  const [when, setWhen] = useState(initial?.scheduled_at ? format(parseISO(initial.scheduled_at), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [desc, setDesc] = useState(initial?.description || '')

  return (
    <DialogContent className="glass-strong sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{initial?.id ? 'Edit content' : 'New content piece'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Title</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Working title…" className="bg-white/[0.03]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs tracking-wider uppercase text-muted-foreground">Platform</label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger className="bg-white/[0.03]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_META).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs tracking-wider uppercase text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white/[0.03]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_META).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Scheduled at</label>
          <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="bg-white/[0.03]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Description</label>
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Notes, hook, caption…" className="bg-white/[0.03]" />
        </div>
      </div>
      <DialogFooter>
        {onDelete && (
          <Button variant="ghost" onClick={onDelete} className="text-red-300 hover:text-red-200 hover:bg-red-500/10 mr-auto">Delete</Button>
        )}
        <Button onClick={() => onSubmit({
          id: (initial?.id as string) || 'p'+Date.now(),
          title: title || 'Untitled',
          platform, status,
          scheduled_at: new Date(when).toISOString(),
          description: desc
        })} className="bg-gold-gradient text-black">Save</Button>
      </DialogFooter>
    </DialogContent>
  )
}
