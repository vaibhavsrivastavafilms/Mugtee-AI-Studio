'use client'
import { useStore } from '@/lib/store'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, format, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns'
import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Film, Image as ImageIcon, FileVideo, Music, Check, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLATFORM_META, STATUS_META } from '@/lib/dummy-data'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirm } from '@/components/ui/confirm'
import type { ContentPiece, Platform } from '@/lib/types'
import { AiButton } from '@/components/ai/ai-button'
import { WeeklyPlannerDialog } from '@/components/ai/weekly-planner-dialog'
import { NotionCalendarSync } from '@/components/integrations/notion-calendar-sync'

export default function CalendarPage() {
  const { content, addContent, updateContent, removeContent } = useStore()
  const confirm = useConfirm()
  const [cursor, setCursor] = useState<Date | null>(null)
  const [today, setToday] = useState<Date | null>(null)
  const [creating, setCreating] = useState<{date: Date | null, open: boolean}>({date:null, open:false})
  const [editing, setEditing] = useState<ContentPiece | null>(null)
  const [plannerOpen, setPlannerOpen] = useState(false)

  useEffect(() => {
    const now = new Date()
    setCursor(now)
    setToday(now)
  }, [])
  // Phase 7C — drag-to-reschedule (native HTML5, no deps). Preserves time-of-day, just shifts the date part.
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const handleDropOnDay = (day: Date) => {
    if (!dragId) return
    const item = content.find(c => c.id === dragId)
    setDragId(null); setDragOverKey(null)
    if (!item?.scheduled_at) return
    const existing = parseISO(item.scheduled_at)
    if (isSameDay(existing, day)) return
    const next = new Date(day)
    next.setHours(existing.getHours(), existing.getMinutes(), existing.getSeconds(), 0)
    updateContent(item.id, { scheduled_at: next.toISOString() })
  }

  const start = cursor ? startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }) : null
  const end = cursor ? endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) : null
  const days = start && end ? eachDayOfInterval({ start, end }) : []

  // Phase P1 — perf: build per-day index maps ONCE per content/cursor change,
  // instead of running filter() and a nested loop on every one of the 42 cells per render.
  const stages: { field: 'script_due_date' | 'shoot_date' | 'edit_due_date'; label: string; dot: string }[] = [
    { field: 'script_due_date', label: 'Script', dot: 'bg-blue-400' },
    { field: 'shoot_date',      label: 'Shoot',  dot: 'bg-orange-400' },
    { field: 'edit_due_date',   label: 'Edit',   dot: 'bg-purple-400' },
  ]
  const { itemsByDay, stagesByDay } = useMemo(() => {
    const im = new Map<string, ContentPiece[]>()
    const sm = new Map<string, { id: string; title: string; label: string; dot: string }[]>()
    const keyOf = (iso: string) => iso.slice(0, 10) // YYYY-MM-DD
    for (const c of content as any[]) {
      if (c.scheduled_at) {
        const k = keyOf(c.scheduled_at)
        ;(im.get(k) || im.set(k, []).get(k))!.push(c)
      }
      for (const stg of stages) {
        const v = c[stg.field]
        if (v) {
          const k = keyOf(v)
          ;(sm.get(k) || sm.set(k, []).get(k))!.push({ id: c.id + ':' + stg.field, title: c.title, label: stg.label, dot: stg.dot })
        }
      }
    }
    return { itemsByDay: im, stagesByDay: sm }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Content Calendar</div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">{cursor ? format(cursor, 'MMMM') : 'Calendar'}</span>{cursor ? ` ${format(cursor, 'yyyy')}` : ''}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cursor && setCursor(subMonths(cursor, 1))}
              className="p-2 rounded-lg glass"
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCursor(new Date())} className="px-3 py-2 text-xs rounded-lg glass">Today</button>
            <button
              type="button"
              onClick={() => cursor && setCursor(addMonths(cursor, 1))}
              className="p-2 rounded-lg glass"
              aria-label="Next month"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <Button onClick={() => setPlannerOpen(true)} variant="outline" className="ml-2 h-9 gap-2 border-gold-500/30 hover:border-gold-500/60 hover:bg-gold-500/10 text-gold-300">
              <Sparkles className="w-4 h-4" /> Plan Week
            </Button>
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

      <NotionCalendarSync />

      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}
        className="glass rounded-2xl p-3 sm:p-5"
      >
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-[10px] sm:text-xs tracking-[0.2em] uppercase text-muted-foreground text-center pb-2">{d}</div>
          ))}
          {days.map(day => {
            const dayKey2 = format(day, 'yyyy-MM-dd')
            const items = itemsByDay.get(dayKey2) || []
            const stageEvents = stagesByDay.get(dayKey2) || []
            const inMonth = cursor ? isSameMonth(day, cursor) : false
            const isToday = today ? isSameDay(day, today) : false
            const dayKey = day.toISOString()
            const isDragOver = dragOverKey === dayKey && !!dragId
            return (
              <div key={dayKey}
                onDragOver={(e) => { if (dragId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverKey !== dayKey) setDragOverKey(dayKey) } }}
                onDragLeave={(e) => { if (dragOverKey === dayKey) setDragOverKey(null) }}
                onDrop={(e) => { e.preventDefault(); handleDropOnDay(day) }}
                className={cn(
                  'group relative min-h-[88px] sm:min-h-[140px] rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 transition-all cursor-pointer hover:bg-white/[0.04]',
                  inMonth ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-transparent border border-transparent opacity-40',
                  isToday && 'ring-1 ring-gold-500/60 bg-gold-500/[0.06]',
                  isDragOver && 'ring-2 ring-gold-400/80 bg-gold-500/[0.12] scale-[1.01]'
                )}
                onClick={() => { setCreating({date: day, open: true}) }}
              >
                <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                  <div className={cn('text-[11px] sm:text-sm font-medium tabular-nums', isToday ? 'text-gold-300' : 'text-foreground')}>{format(day, 'd')}</div>
                  <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 text-gold-300 hidden sm:block" />
                </div>
                <div className="space-y-1">
                  {items.map(i => (
                    <button key={i.id}
                      draggable
                      onDragStart={(e) => { setDragId(i.id); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', i.id) } catch {} }}
                      onDragEnd={() => { setDragId(null); setDragOverKey(null) }}
                      onClick={(e) => { e.stopPropagation(); setEditing(i) }}
                      title={i.media_url ? 'Media attached' : undefined}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded-md bg-gradient-to-r from-gold-500/15 to-transparent border border-gold-500/25 hover:border-gold-500/50 transition active:cursor-grabbing cursor-grab',
                        dragId === i.id && 'opacity-40'
                      )}
                    >
                      <div className="text-[10px] truncate font-medium">{i.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-[9px] uppercase tracking-wider', PLATFORM_META[i.platform].color)}>{PLATFORM_META[i.platform].label}</span>
                        <span className="text-[9px] text-muted-foreground">{format(parseISO(i.scheduled_at!), 'HH:mm')}</span>
                        {i.media_url && (
                          <Film className="w-2.5 h-2.5 text-gold-400 ml-auto shrink-0" aria-label="Media attached" />
                        )}
                      </div>
                    </button>
                  ))}
                  {stageEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] tracking-wider text-muted-foreground" title={`${ev.label} · ${ev.title}`}>
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', ev.dot)} />
                      <span className="uppercase">{ev.label}</span>
                      <span className="truncate text-luxe/70 normal-case">{ev.title}</span>
                    </div>
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

      {/* Phase 12 — Weekly AI Content Planner */}
      <WeeklyPlannerDialog open={plannerOpen} onOpenChange={setPlannerOpen} />
    </div>
  )
}

function CreateOrEditDialog({ initial, onSubmit, onDelete }: { initial?: Partial<ContentPiece>; onSubmit: (item: ContentPiece) => void; onDelete?: () => void }) {
  const { media } = useStore()
  const [title, setTitle] = useState(initial?.title || '')
  const [platform, setPlatform] = useState<Platform>((initial?.platform as Platform) || 'instagram')
  const [status, setStatus] = useState((initial?.status as any) || 'scheduled')
  const [when, setWhen] = useState(initial?.scheduled_at ? format(parseISO(initial.scheduled_at), "yyyy-MM-dd'T'HH:mm") : '')
  const [desc, setDesc] = useState(initial?.description || '')
  const initLocal = (iso?: string | null) => iso ? format(parseISO(iso), "yyyy-MM-dd'T'HH:mm") : ''
  const [scriptDue, setScriptDue] = useState(initLocal(initial?.script_due_date as any))
  const [shootAt, setShootAt]     = useState(initLocal(initial?.shoot_date as any))
  const [editDue, setEditDue]     = useState(initLocal(initial?.edit_due_date as any))
  // Phase 8B — media picker state
  const [mediaUrl, setMediaUrl]   = useState<string>((initial as any)?.media_url || '')
  const [showLibrary, setShowLibrary] = useState(false)
  const validMediaUrl = !mediaUrl || /^https?:\/\//i.test(mediaUrl)
  const supportedFormat = !mediaUrl || /\.(mp4|mov|jpe?g|png|webp)(\?|#|$)/i.test(mediaUrl)
  const isVideo = mediaUrl && /\.(mp4|mov)(\?|#|$)/i.test(mediaUrl)
  const selectedAsset = mediaUrl ? media.find(m => m.url === mediaUrl) : null
  const urlWarning = mediaUrl && !validMediaUrl ? 'Media URL must start with http(s)://' : null
  const formatWarning = mediaUrl && validMediaUrl && !supportedFormat ? 'Unsupported format. Use .mp4, .mov, .jpg, .png, or .webp.' : null

  useEffect(() => {
    if (initial?.scheduled_at) {
      setWhen(format(parseISO(initial.scheduled_at), "yyyy-MM-dd'T'HH:mm"))
      return
    }
    setWhen(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  }, [initial?.scheduled_at])

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
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Publish at</label>
          <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="bg-white/[0.03]" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-wider uppercase text-blue-300/80">Script due</label>
            <Input type="datetime-local" value={scriptDue} onChange={e => setScriptDue(e.target.value)} className="bg-white/[0.03] h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-wider uppercase text-orange-300/80">Shoot</label>
            <Input type="datetime-local" value={shootAt} onChange={e => setShootAt(e.target.value)} className="bg-white/[0.03] h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-wider uppercase text-purple-300/80">Edit due</label>
            <Input type="datetime-local" value={editDue} onChange={e => setEditDue(e.target.value)} className="bg-white/[0.03] h-9 text-xs" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Description</label>
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Notes, hook, caption…" className="bg-white/[0.03]" />
        </div>

        {/* Phase 8B — media picker */}
        <div className="space-y-2 pt-2 border-t border-white/[0.05]">
          {mediaUrl && (
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.03] border border-gold-500/20">
              <div className="relative w-12 h-12 rounded-md overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-gold-500/30">
                {isVideo ? (
                  selectedAsset?.thumbnail ? (
                    <Image src={selectedAsset.thumbnail} alt="" fill className="object-cover" unoptimized sizes="48px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gold-400"><FileVideo className="w-4 h-4" /></div>
                  )
                ) : (
                  <Image src={mediaUrl} alt="" fill className="object-cover" unoptimized sizes="48px" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium truncate">{selectedAsset?.title || mediaUrl.split('/').pop()?.split('?')[0] || 'Attached media'}</div>
                <div className="text-[10px] text-muted-foreground truncate font-mono">{mediaUrl}</div>
              </div>
              <button onClick={() => setMediaUrl('')} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-red-300 transition shrink-0" aria-label="Remove media">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] tracking-wider uppercase text-muted-foreground">{mediaUrl ? 'Replace media' : 'Attach media'}</label>
              <button
                type="button"
                onClick={() => setShowLibrary(s => !s)}
                className="text-[10px] tracking-wider uppercase text-gold-300 hover:text-gold-200 transition inline-flex items-center gap-1"
              >
                <ImageIcon className="w-3 h-3" /> {showLibrary ? 'Hide library' : `From library (${media.length})`}
              </button>
            </div>
            <Input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://…/reel.mp4 — or pick from library →" className="bg-white/[0.03] font-mono text-xs" />
          </div>
          {showLibrary && (
            <div className="rounded-lg bg-black/30 border border-white/[0.05] p-2 max-h-40 overflow-y-auto scrollbar-luxe">
              {media.length === 0 ? (
                <div className="text-[11px] text-muted-foreground text-center py-4">No media yet · upload in <span className="text-gold-300">Media Library</span></div>
              ) : (
                <div className="grid grid-cols-5 gap-1.5">
                  {media.filter(m => !!m.url).slice(0, 25).map(m => {
                    const selected = m.url === mediaUrl
                    const vid = m.type === 'video'
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setMediaUrl(m.url || ''); setShowLibrary(false) }}
                        title={m.title}
                        className={cn(
                          'group relative aspect-square rounded-md overflow-hidden bg-zinc-900 ring-1 transition-all hover:scale-105 hover:ring-gold-500/60',
                          selected ? 'ring-2 ring-gold-400 shadow-gold-glow' : 'ring-white/[0.06]'
                        )}
                      >
                        {m.thumbnail ? (
                          <Image src={m.thumbnail} alt={m.title} fill className="object-cover" unoptimized sizes="80px" />
                        ) : vid ? (
                          <div className="w-full h-full flex items-center justify-center text-gold-400/70 bg-gradient-to-br from-zinc-800 to-zinc-900"><FileVideo className="w-4 h-4" /></div>
                        ) : m.type === 'audio' ? (
                          <div className="w-full h-full flex items-center justify-center text-gold-400/70 bg-gradient-to-br from-zinc-800 to-zinc-900"><Music className="w-4 h-4" /></div>
                        ) : (
                          <Image src={m.url || ''} alt={m.title} fill className="object-cover" unoptimized sizes="80px" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                        )}
                        {selected && (
                          <div className="absolute inset-0 bg-gold-500/30 flex items-center justify-center">
                            <Check className="w-4 h-4 text-black bg-gold-400 rounded-full p-0.5" />
                          </div>
                        )}
                        {vid && !selected && (
                          <div className="absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] bg-black/70 text-gold-300 tracking-widest">REEL</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {(urlWarning || formatWarning) && (
            <div className="flex items-start gap-2 text-[11px] text-amber-200 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
              <span className="text-amber-300 mt-0.5">⚠</span>
              <span>{urlWarning || formatWarning}</span>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        {onDelete && (
          <Button variant="ghost" onClick={onDelete} className="text-red-300 hover:text-red-200 hover:bg-red-500/10 mr-auto">Delete</Button>
        )}
        {initial?.id && (
          <AiButton content={initial as ContentPiece} variant="pill" className="mr-2" />
        )}
        <Button onClick={() => onSubmit({
          id: (initial?.id as string) || 'p'+Date.now(),
          title: title || 'Untitled',
          platform, status,
          scheduled_at: new Date(when).toISOString(),
          description: desc,
          script_due_date: scriptDue ? new Date(scriptDue).toISOString() : null,
          shoot_date:      shootAt   ? new Date(shootAt).toISOString()   : null,
          edit_due_date:   editDue   ? new Date(editDue).toISOString()   : null,
          media_url:       mediaUrl  || null,
        } as ContentPiece)} className="bg-gold-gradient text-black">Save</Button>
      </DialogFooter>
    </DialogContent>
  )
}
