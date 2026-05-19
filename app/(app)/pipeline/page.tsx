'use client'
import { useStore } from '@/lib/store'
import { motion } from 'framer-motion'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useDroppable } from '@dnd-kit/core'
import { Plus, GripVertical, User, Calendar as CalendarIcon, Trash2, X } from 'lucide-react'
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

const COLUMNS: ContentStatus[] = ['idea','scripting','shooting','editing','scheduled','published']

export default function PipelinePage() {
  const { content, setStatus, updateContent, addContent, removeContent } = useStore()
  const confirm = useConfirm()
  const [newCardStatus, setNewCardStatus] = useState<ContentStatus | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const statusParam = searchParams.get('status')

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
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Kanban Pipeline</div>
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">Production</span> flow</h1>
          <p className="text-luxe/70 mt-2">Drag cards across stages to move the story forward.</p>
          {filterLabel && (
            <button onClick={() => router.push('/pipeline')}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-gold text-xs tracking-wide hover:bg-gold-500/20 transition"
            >
              <span className="text-gold-200">Filtered by: <span className="font-semibold text-gold-100">{filterLabel}</span></span>
              <X className="w-3 h-3 text-gold-300" />
            </button>
          )}
        </div>
      </motion.div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-luxe -mx-4 px-4">
          {visibleColumns.map((col, i) => {
            const items = content.filter(c => c.status === col)
            return (
              <KanbanColumn key={col} id={col} index={i} items={items} onAdd={() => setNewCardStatus(col)} />
            )
          })}
        </div>
        <DragOverlay>
          {activeItem ? <KanbanCard item={activeItem} dragging /> : null}        </DragOverlay>
      </DndContext>

      <NewCardDialog
        status={newCardStatus}
        onClose={() => setNewCardStatus(null)}
        onCreate={(data) => { addContent(data); setNewCardStatus(null) }}
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
  const meta = STATUS_META[id]
  return (
    <motion.div
      initial={{opacity:0, y:14}} animate={{opacity:1, y:0}} transition={{delay:index*0.05}}
      className="w-[300px] sm:w-[320px] shrink-0"
    >
      <div className={cn('rounded-2xl glass border transition-colors h-full flex flex-col', isOver ? 'border-gold-500/50 bg-gold-500/[0.04]' : 'border-white/[0.06]')}>
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', id === 'published' ? 'bg-emerald-400' : id === 'scheduled' ? 'bg-gold-400' : id === 'editing' ? 'bg-purple-400' : id === 'shooting' ? 'bg-orange-400' : id === 'scripting' ? 'bg-blue-400' : 'bg-zinc-400')} />
            <span className="text-xs tracking-[0.2em] uppercase font-medium">{meta.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
          </div>
          <button onClick={onAdd} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-gold-300">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div ref={setNodeRef} className="flex-1 px-3 pb-3 space-y-2 min-h-[200px] max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-luxe">
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map(i => <SortableCard key={i.id} item={i} />)}
          </SortableContext>
          {items.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8 border border-dashed border-white/[0.05] rounded-xl">Drop cards here</div>
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
  return (
    <div className={cn(
      'group rounded-xl p-3.5 border bg-gradient-to-br from-white/[0.05] to-white/[0.01] transition-all relative',
      'hover:border-gold-500/40 hover:shadow-cinema cursor-grab active:cursor-grabbing',
      dragging ? 'border-gold-500/60 shadow-gold-glow-lg rotate-2 scale-105' : 'border-white/[0.06]'
    )}>
      {!dragging && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
          <AiButton content={item} variant="icon" />
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
      <div className="flex items-center justify-between mt-3">
        <span className={cn('text-[10px] tracking-[0.15em] uppercase font-medium', platform.color)}>{platform.label}</span>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {item.assignee && (<span className="flex items-center gap-1"><User className="w-3 h-3" />{item.assignee.split(' ')[0]}</span>)}
          {item.due_date && (<span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{format(parseISO(item.due_date), 'MMM d')}</span>)}
        </div>
      </div>
    </div>
  )
}
