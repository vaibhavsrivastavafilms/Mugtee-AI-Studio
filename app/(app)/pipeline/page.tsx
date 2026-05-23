'use client'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDroppable } from '@dnd-kit/core'
import { Plus, GripVertical, User, Calendar as CalendarIcon, Trash2, X, CalendarCheck, Send, FileVideo, Image as ImageIcon, Music, Film, Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_META, PLATFORM_META } from '@/lib/dummy-data'
import type { ContentPiece, ContentStatus, Platform } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { useConfirm } from '@/components/ui/confirm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AiButton } from '@/components/ai/ai-button'
import { ViralStudioPanel } from '@/components/ai/viral-studio-panel'
import { YoutubePublishButton, YoutubeStatusBadge } from '@/components/youtube/publish-button'
import { useAutomations } from '@/lib/automations-store'
import { NewProjectModal } from '@/components/projects/new-project-modal'

const COLUMNS: ContentStatus[] = ['idea','scripting','shooting','editing','scheduled','published']

const ScheduleCtx = createContext<(p: ContentPiece) => void>(() => {})
// Phase P3 — bulk selection context. Each card pulls (selected, toggle) — bar reads (selected set, actions).
const SelectionCtx = createContext<{ selected: Set<string>; toggle: (id: string) => void } | null>(null)

export default function PipelinePage() {
  const { content, setStatus, updateContent, addContent, removeContent } = useStore()
  const confirm = useConfirm()
  const [newCardStatus, setNewCardStatus] = useState<ContentStatus | null>(null)
  const [scheduling, setScheduling] = useState<ContentPiece | null>(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const statusParam = searchParams.get('status')

  // Phase P3 — bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggleSelect = useCallback((id: string) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const clearSelection = useCallback(() => setSelected(new Set()), [])
  const selectionCtxValue = useMemo(() => ({ selected, toggle: toggleSelect }), [selected, toggleSelect])

  const bulkMove = async (target: ContentStatus) => {
    const ids = Array.from(selected)
    for (const id of ids) { setStatus(id, target) }
    clearSelection()
  }
  const bulkDelete = async () => {
    const count = selected.size
    if (!count) return
    if (!(await confirm({ title: `Delete ${count} card${count>1?'s':''}?`, description: 'They will be removed from your projects.', destructive: true }))) return
    for (const id of Array.from(selected)) { removeContent(id) }
    clearSelection()
  }

  const visibleColumns = useMemo(() => {
    if (statusParam === 'production') return ['scripting','shooting','editing'] as ContentStatus[]
    if (statusParam && (COLUMNS as readonly string[]).includes(statusParam)) return [statusParam as ContentStatus]
    return COLUMNS
  }, [statusParam])

  const filterLabel = statusParam === 'production' ? 'In Production' : (statusParam ? STATUS_META[statusParam]?.label : null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const overId = String(over.id)
    const activeId = String(active.id)
    // If dropped on a column id, move there
    if (COLUMNS.includes(overId as ContentStatus)) {
      setStatus(activeId, overId as ContentStatus)
      return
    }
    // Else find target item's status
    const target = content.find(c => c.id === overId)
    if (target) setStatus(activeId, target.status)
  }

  const activeItem = activeId ? content.find(c => c.id === activeId) : null

  return (
    <div className="max-w-[1800px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Projects</div>
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">What are we</span> creating today?</h1>
          <p className="text-luxe/70 mt-2">Turn one idea into a full viral production pipeline.</p>
          {filterLabel && (
            <button onClick={() => router.push('/pipeline')}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-gold text-xs tracking-wide hover:bg-gold-500/20 transition"
            >
              <span className="text-gold-200">Filtered by: <span className="font-semibold text-gold-100">{filterLabel}</span></span>
              <X className="w-3 h-3 text-gold-300" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Phase 3H — "+ New Project" always lands creators in the cinematic
              /workspace with a fresh canvas. No modal, no stale residue.
              The legacy NewProjectModal is preserved below for backward compat
              but is no longer reachable from this button. */}
          <Link
            href="/workspace?fresh=1"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-gradient text-black text-sm font-medium shadow-gold-glow hover:opacity-90 transition"
          >
            <Sparkles className="w-4 h-4" /> + New Project
          </Link>
        </div>
      </motion.div>
      <NewProjectModal open={newProjectOpen} onOpenChange={setNewProjectOpen} />

      <ScheduleCtx.Provider value={setScheduling}>
      <SelectionCtx.Provider value={selectionCtxValue}>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            {/* Phase 3H — desktop fits all 6 columns in a responsive grid (no
                horizontal scroll). Mobile/tablet still uses snap-x scroll. */}
            <div className="flex gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible lg:grid lg:grid-cols-6 lg:gap-3 pb-4 scrollbar-luxe -mx-4 px-4 lg:mx-0 lg:px-0 snap-x snap-mandatory sm:snap-none lg:snap-none">
              {visibleColumns.map((col, i) => {
                const items = content.filter(c => c.status === col)
                return (
                  <KanbanColumn key={col} id={col} index={i} items={items} onAdd={() => setNewCardStatus(col)} />
                )
              })}
            </div>
          </div>
          {/* Side panel hidden on mobile to give the Kanban full width */}
          <div className="hidden lg:block"><ViralStudioPanel /></div>
        </div>
        <DragOverlay>
          {activeItem ? <KanbanCard item={activeItem} dragging /> : null}        </DragOverlay>
      </DndContext>
      </SelectionCtx.Provider>
      </ScheduleCtx.Provider>

      {/* Phase P3 — Floating bulk action bar */}
      <BulkActionBar
        count={selected.size}
        onClear={clearSelection}
        onMove={bulkMove}
        onDelete={bulkDelete}
        onSchedule={() => {
          const first = content.find(c => selected.has(c.id))
          if (first) setScheduling(first)
        }}
      />

      <NewCardDialog
        status={newCardStatus}
        onClose={() => setNewCardStatus(null)}
        onCreate={(data) => { addContent(data); setNewCardStatus(null) }}
      />

      <ScheduleDialog
        item={scheduling}
        onClose={() => setScheduling(null)}
      />
    </div>
  )
}

function NewCardDialog({ status, onClose, onCreate }: { status: ContentStatus | null; onClose: () => void; onCreate: (data: Partial<ContentPiece>) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState<Platform>('youtube')

  useEffect(() => {
    if (status) { setTitle(''); setDescription(''); setPlatform('youtube') }
  }, [status])

  return (
    <Dialog open={!!status} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            New <span className="text-gold-gradient">{status ? STATUS_META[status].label : ''}</span> idea
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs tracking-wider uppercase text-muted-foreground">Title</label>
            <Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Working title…" className="bg-white/[0.03]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs tracking-wider uppercase text-muted-foreground">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Hook, concept, or notes…" className="bg-white/[0.03]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs tracking-wider uppercase text-muted-foreground">Platform</label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger className="bg-white/[0.03]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            if (!status) return
            onCreate({ title: title.trim() || 'Untitled', description: description.trim() || null, platform, status })
          }} className="bg-gold-gradient text-black">Create card</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function KanbanColumn({ id, items, onAdd, index }: { id: ContentStatus; items: ContentPiece[]; onAdd: () => void; index: number }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const { loading } = useStore()
  const meta = STATUS_META[id]
  const isInitial = loading.initial && items.length === 0
  // Phase 1 polish — per-status onboarding nudge instead of generic "Drop cards here"
  const EMPTY_NUDGE: Record<ContentStatus, { title: string; sub: string }> = {
    idea:      { title: 'No ideas yet',      sub: 'Generate viral hooks in AI Studio or click + to add one' },
    scripting: { title: 'Nothing in scripting', sub: 'Drag a card here when you start writing the script' },
    shooting:  { title: 'Nothing shooting',  sub: 'Move cards here on the day of the shoot' },
    editing:   { title: 'Nothing in edit',   sub: 'Drag cards here while your video is in post' },
    scheduled: { title: 'Nothing scheduled', sub: 'Schedule a card and it lands here automatically' },
    published: { title: 'Nothing published', sub: 'Published posts appear here with their links' },
  } as any
  const empty = EMPTY_NUDGE[id] || { title: 'Empty', sub: 'Drop cards here' }
  return (
    <motion.div
      initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:index*0.05}}
      className="w-[88vw] max-w-[320px] sm:w-[320px] shrink-0 snap-start lg:w-full lg:max-w-none lg:shrink"
    >
      <div className={cn('rounded-2xl glass border transition-colors h-full flex flex-col', isOver ? 'border-gold-500/50 bg-gold-500/[0.04]' : 'border-white/[0.06]')}>
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', id === 'published' ? 'bg-emerald-400' : id === 'scheduled' ? 'bg-gold-400' : id === 'editing' ? 'bg-purple-400' : id === 'shooting' ? 'bg-orange-400' : id === 'scripting' ? 'bg-blue-400' : 'bg-zinc-400')} />
            <span className="text-xs tracking-[0.2em] uppercase font-medium">{meta.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
          </div>
          <button onClick={onAdd} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-gold-300" aria-label={`Add to ${meta.label}`}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div ref={setNodeRef} className="flex-1 px-3 pb-3 space-y-2 min-h-[200px] max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-luxe">
          {isInitial ? (
            <>
              <div className="h-[68px] rounded-xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
              <div className="h-[68px] rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse" style={{ animationDelay: '120ms' }} />
              <div className="h-[68px] rounded-xl bg-white/[0.015] border border-white/[0.04] animate-pulse" style={{ animationDelay: '240ms' }} />
            </>
          ) : (
            <>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {items.map(i => <SortableCard key={i.id} item={i} />)}
              </SortableContext>
              {items.length === 0 && (
                <div className="text-center py-8 border border-dashed border-white/[0.06] rounded-xl">
                  <div className="text-xs text-luxe/80">{empty.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 px-3 leading-relaxed">{empty.sub}</div>
                  <button onClick={onAdd} className="mt-3 inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-gold-300/80 hover:text-gold-200 transition">
                    <Plus className="w-3 h-3" /> Add card
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function SortableCard({ item }: { item: ContentPiece }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard item={item} />
    </div>
  )
}

function KanbanCard({ item, dragging }: { item: ContentPiece; dragging?: boolean }) {
  const platform = PLATFORM_META[item.platform]
  const { removeContent } = useStore()
  const confirm = useConfirm()
  const onSchedule = useContext(ScheduleCtx)
  const sel = useContext(SelectionCtx)
  const selected = !!sel?.selected.has(item.id)
  const anySelected = !!sel && sel.selected.size > 0
  const stages: { key: keyof ContentPiece; label: string; dot: string }[] = [
    { key: 'script_due_date', label: 'S', dot: 'bg-blue-400' },
    { key: 'shoot_date',      label: 'F', dot: 'bg-orange-400' },
    { key: 'edit_due_date',   label: 'E', dot: 'bg-purple-400' },
    { key: 'scheduled_at',    label: 'P', dot: 'bg-gold-400' },
  ]
  const activeStages = stages.filter(s => !!(item as any)[s.key])
  return (
    <div className={cn(
      'group rounded-xl p-3.5 border bg-gradient-to-br from-white/[0.05] to-white/[0.01] transition-all relative',
      'hover:border-gold-500/40 hover:shadow-cinema cursor-grab active:cursor-grabbing',
      dragging ? 'border-gold-500/60 shadow-gold-glow-lg rotate-2 scale-105' : selected ? 'border-gold-500/60 bg-gold-500/[0.08] shadow-cinema' : 'border-white/[0.06]'
    )}>
      {/* Phase P3 — selection toggle (always rendered; subtly shown when nothing selected, prominent when in select-mode) */}
      {!dragging && sel && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); sel.toggle(item.id) }}
          className={cn(
            'absolute top-2 left-2 z-10 w-5 h-5 rounded-md flex items-center justify-center transition-all',
            selected
              ? 'bg-gold-gradient text-black shadow-gold-glow'
              : anySelected
                ? 'bg-black/40 border border-gold-500/40 text-gold-300/70 hover:bg-gold-500/30'
                : 'bg-black/30 border border-white/[0.08] text-transparent opacity-0 group-hover:opacity-100 hover:text-gold-300/80 hover:border-gold-500/40'
          )}
          aria-label={selected ? 'Deselect' : 'Select'}
          title={selected ? 'Deselect' : 'Select'}
        >
          {selected && <Check className="w-3 h-3" />}
          {!selected && <Check className="w-3 h-3 opacity-30" />}
        </button>
      )}
      {!dragging && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
          <AiButton content={item} variant="icon" />
          {/* Phase P4 — YouTube publish action (only for YouTube-platform pieces) */}
          {item.platform === 'youtube' && <YoutubePublishButton item={item} />}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSchedule(item) }}
            className="p-1.5 rounded-md bg-black/40 backdrop-blur hover:bg-gold-500/30 ring-1 ring-gold-500/30 transition"
            aria-label="Schedule"
            title="Schedule production timeline"
          >
            <CalendarCheck className="w-3 h-3" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={async (e) => {
              e.stopPropagation()
              if (await confirm({ title: `Delete "${item.title}"?`, description: 'This content piece will be removed from your pipeline.', destructive: true })) {
                removeContent(item.id)
              }
            }}
            className="p-1.5 rounded-md bg-black/40 backdrop-blur hover:bg-red-500/60 transition"
            aria-label="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex items-start gap-2 mb-2">
        <GripVertical className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/50 group-hover:text-gold-400/60" />
        <div className="flex-1 min-w-0 pr-6">
          <div className="text-sm font-medium leading-snug">{item.title}</div>
          {item.description && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.description}</div>}
        </div>
      </div>
      {/* Phase 8B — attached media preview */}
      {item.media_url && (() => {
        const url = item.media_url
        const isVid = /\.(mp4|mov)(\?|#|$)/i.test(url)
        const filename = url.split('/').pop()?.split('?')[0] || 'media'
        return (
          <div className="flex items-center gap-2 mb-2 p-1.5 rounded-lg bg-white/[0.025] border border-gold-500/15 group/media relative">
            <div className="w-9 h-9 rounded-md overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-gold-500/20 transition-transform group-hover/media:scale-110 group-hover/media:ring-gold-500/60">
              {isVid ? (
                <div className="w-full h-full flex items-center justify-center text-gold-400/80"><Film className="w-4 h-4" /></div>
              ) : (
                <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground truncate flex-1">{isVid ? 'Reel · ' : ''}{filename}</span>
          </div>
        )
      })()}
      {activeStages.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 mb-2">
          {activeStages.map(stg => (
            <span key={stg.key as string} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] tracking-widest text-muted-foreground bg-white/[0.03] border border-white/[0.05]" title={`${stg.label} timeline set`}>
              <span className={cn('w-1.5 h-1.5 rounded-full', stg.dot)} />
              {stg.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className={cn('text-[10px] tracking-[0.15em] uppercase font-medium', platform.color)}>{platform.label}</span>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <YoutubeStatusBadge item={item} />
          {item.assignee && (<span className="flex items-center gap-1"><User className="w-3 h-3" />{item.assignee.split(' ')[0]}</span>)}
          {item.due_date && (<span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{format(parseISO(item.due_date), 'MMM d')}</span>)}
        </div>
      </div>
    </div>
  )
}


function ScheduleDialog({ item, onClose }: { item: ContentPiece | null; onClose: () => void }) {
  const { updateContent, setStatus, media } = useStore()
  const { enqueue, queue } = useAutomations()
  const toLocal = (iso?: string | null) => iso ? format(parseISO(iso), "yyyy-MM-dd'T'HH:mm") : ''
  const [scriptDue, setScriptDue] = useState('')
  const [shootAt, setShootAt]     = useState('')
  const [editDue, setEditDue]     = useState('')
  const [publishAt, setPublishAt] = useState('')
  const [autoQueue, setAutoQueue] = useState(true)
  const [mediaUrl, setMediaUrl]   = useState('')
  const [caption, setCaption]     = useState('')
  const [igConnected, setIgConnected] = useState<boolean | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)

  useEffect(() => {
    if (item) {
      setScriptDue(toLocal(item.script_due_date as any))
      setShootAt(toLocal(item.shoot_date as any))
      setEditDue(toLocal(item.edit_due_date as any))
      setPublishAt(toLocal(item.scheduled_at as any))
      setMediaUrl(item.media_url || '')
      setCaption(item.description || '')
      setAutoQueue(true)
      setShowLibrary(false)
    }
  }, [item])

  // Check IG connection status when dialog opens (for Instagram-platform content)
  useEffect(() => {
    if (!item || item.platform !== 'instagram') { setIgConnected(null); return }
    let cancelled = false
    fetch('/api/instagram/status').then(r => r.json()).then(d => { if (!cancelled) setIgConnected(!!d?.connected) }).catch(() => { if (!cancelled) setIgConnected(false) })
    return () => { cancelled = true }
  }, [item])

  if (!item) return null

  const isInstagram = item.platform === 'instagram'
  const validMediaUrl = !mediaUrl || /^https?:\/\//i.test(mediaUrl)
  // Phase 8B — supported-format check for IG (mp4/mov/jpg/jpeg/png/webp)
  const supportedFormat = !mediaUrl || /\.(mp4|mov|jpe?g|png|webp)(\?|#|$)/i.test(mediaUrl)
  const selectedAsset = mediaUrl ? media.find(m => m.url === mediaUrl) : null
  const isVideo = mediaUrl && /\.(mp4|mov)(\?|#|$)/i.test(mediaUrl)
  const mediaWarning = isInstagram && publishAt && !mediaUrl ? 'Instagram requires media (mp4/mov for Reels, jpg/png for Feed).' : null
  const captionWarning = isInstagram && publishAt && !caption.trim() ? 'Instagram requires a caption (use the Description field).' : null
  const connectWarning = isInstagram && publishAt && igConnected === false ? 'Instagram not connected — Connect in Settings → Integrations.' : null
  const urlWarning = mediaUrl && !validMediaUrl ? 'Media URL must start with http(s)://' : null
  const formatWarning = mediaUrl && validMediaUrl && !supportedFormat ? 'Unsupported format. Use .mp4, .mov, .jpg, .png, or .webp.' : null
  const warnings = [mediaWarning, captionWarning, connectWarning, urlWarning, formatWarning].filter(Boolean) as string[]

  const save = async () => {
    const patch: Partial<ContentPiece> = {
      script_due_date: scriptDue ? new Date(scriptDue).toISOString() : null,
      shoot_date:      shootAt   ? new Date(shootAt).toISOString()   : null,
      edit_due_date:   editDue   ? new Date(editDue).toISOString()   : null,
      scheduled_at:    publishAt ? new Date(publishAt).toISOString() : null,
      media_url:       mediaUrl  || null,
      description:     caption   || null,
    }
    await updateContent(item.id, patch)
    if (publishAt && item.status !== 'scheduled' && item.status !== 'published') {
      await setStatus(item.id, 'scheduled')
    }
    if (autoQueue && publishAt) {
      const exists = queue.some(q => q.content_id === item.id && q.status !== 'failed' && q.status !== 'published')
      if (!exists) {
        await enqueue({
          content_id: item.id,
          platform: item.platform,
          scheduled_for: new Date(publishAt).toISOString(),
          status: 'queued',
        })
      }
    }
    onClose()
  }

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
            <CalendarCheck className="w-3 h-3" /> Production Schedule
          </div>
          <DialogTitle className="font-display text-2xl">
            <span className="text-gold-gradient">Schedule</span> “{item.title}”
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">Plan script, shoot, edit, and publish. Instagram items need media + caption to publish.</p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-wider uppercase text-blue-300/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Script due
              </label>
              <Input type="datetime-local" value={scriptDue} onChange={e => setScriptDue(e.target.value)} className="bg-white/[0.03]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-wider uppercase text-orange-300/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Shoot date
              </label>
              <Input type="datetime-local" value={shootAt} onChange={e => setShootAt(e.target.value)} className="bg-white/[0.03]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-wider uppercase text-purple-300/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Edit due
              </label>
              <Input type="datetime-local" value={editDue} onChange={e => setEditDue(e.target.value)} className="bg-white/[0.03]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-wider uppercase text-gold-300/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-400" /> Publish at
              </label>
              <Input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} className="bg-white/[0.03]" />
            </div>
          </div>

          {/* Media + caption — only relevant when publishing */}
          {(publishAt || isInstagram) && (
            <div className="space-y-2.5 pt-2 border-t border-white/[0.05]">
              {/* Selected media preview chip */}
              {mediaUrl && (
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.03] border border-gold-500/20">
                  <div className="relative w-14 h-14 rounded-md overflow-hidden bg-zinc-900 shrink-0 ring-1 ring-gold-500/30">
                    {isVideo ? (
                      selectedAsset?.thumbnail ? (
                        <img src={selectedAsset.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gold-400"><FileVideo className="w-5 h-5" /></div>
                      )
                    ) : (
                      <img src={mediaUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
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

              {/* Media URL input + library toggle */}
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

              {/* Lightweight media library picker grid */}
              {showLibrary && (
                <div className="rounded-lg bg-black/30 border border-white/[0.05] p-2 max-h-44 overflow-y-auto scrollbar-luxe">
                  {media.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground text-center py-4">No media yet · upload in <span className="text-gold-300">Media Library</span></div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {media.filter(m => !!m.url).slice(0, 24).map(m => {
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
                              <img src={m.thumbnail} alt={m.title} className="w-full h-full object-cover" />
                            ) : vid ? (
                              <div className="w-full h-full flex items-center justify-center text-gold-400/70 bg-gradient-to-br from-zinc-800 to-zinc-900"><FileVideo className="w-4 h-4" /></div>
                            ) : m.type === 'audio' ? (
                              <div className="w-full h-full flex items-center justify-center text-gold-400/70 bg-gradient-to-br from-zinc-800 to-zinc-900"><Music className="w-4 h-4" /></div>
                            ) : (
                              <img src={m.url || ''} alt={m.title} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
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

              <div className="space-y-1.5">
                <label className="text-[10px] tracking-wider uppercase text-muted-foreground">Caption</label>
                <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption / description" className="bg-white/[0.03]" />
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-amber-200">
                  <span className="text-amber-300 mt-0.5">⚠</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {publishAt && (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground select-none cursor-pointer">
              <input type="checkbox" checked={autoQueue} onChange={(e) => setAutoQueue(e.target.checked)} className="accent-gold-500" />
              <Send className="w-3 h-3 text-gold-400" />
              Add to publishing queue immediately
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="mr-auto text-muted-foreground">Cancel</Button>
          <Button onClick={save} className="bg-gold-gradient text-black">Save schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// Phase P3 — floating bulk action bar
function BulkActionBar({ count, onClear, onMove, onDelete, onSchedule }: { count: number; onClear: () => void; onMove: (s: ContentStatus) => void; onDelete: () => void; onSchedule: () => void }) {
  if (count === 0) return null
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 z-[60] w-[min(96vw,720px)] pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="glass-strong rounded-2xl border border-gold-500/40 shadow-cinema p-2 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 flex-wrap"
      >
        <div className="flex items-center gap-2 pl-1 pr-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gold-gradient text-black text-xs font-semibold tabular-nums shadow-gold-glow">{count}</span>
          <span className="text-[11px] tracking-wider uppercase text-luxe hidden sm:inline">selected</span>
        </div>

        <div className="hidden sm:block w-px h-6 bg-white/[0.08] mx-1" />

        {/* Move stage dropdown */}
        <Select onValueChange={(v) => onMove(v as ContentStatus)}>
          <SelectTrigger className="h-8 bg-white/[0.03] border-white/[0.08] text-xs gap-1.5 px-2.5 hover:border-gold-500/40 flex-1 sm:flex-none min-w-[120px]">
            <SelectValue placeholder="Move stage" />
          </SelectTrigger>
          <SelectContent>
            {COLUMNS.map(c => <SelectItem key={c} value={c}>{STATUS_META[c].label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button onClick={onSchedule} variant="ghost" className="h-8 px-2.5 text-xs gap-1.5 text-luxe hover:text-gold-300 hover:bg-white/5">
          <CalendarCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Schedule</span>
        </Button>

        <Button onClick={onDelete} variant="ghost" className="h-8 px-2.5 text-xs gap-1.5 text-luxe hover:text-red-300 hover:bg-red-500/10">
          <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Delete</span>
        </Button>

        <Button onClick={onClear} variant="ghost" className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground ml-auto">
          <X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Clear</span>
        </Button>
      </motion.div>
    </div>
  )
}
