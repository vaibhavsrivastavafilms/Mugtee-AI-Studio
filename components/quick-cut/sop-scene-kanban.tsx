'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoryboardScene, VisualTimelineEntry } from '@/types/storyboard'
import { formatTimelineSecRange } from '@/lib/cinematic/scene-image-prompt'

function SopSceneCard({
  entry,
  meta,
  dragHandle,
  isDragging,
}: {
  entry: VisualTimelineEntry
  meta?: StoryboardScene
  dragHandle?: ReactNode
  isDragging?: boolean
}) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 min-w-[72px]',
        isDragging && 'border-gold-500/40 bg-gold-500/[0.06] shadow-gold-glow'
      )}
      title={meta?.scriptLines || entry.label}
    >
      <div className="flex items-start gap-1">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] tracking-[0.16em] uppercase text-gold-300/70">
            Scene {entry.index}
          </p>
          <p className="text-[10px] text-luxe/55 truncate mt-0.5">
            {meta?.visualFocus || entry.label}
          </p>
          <p className="text-[9px] text-luxe/35 tabular-nums mt-0.5">
            {formatTimelineSecRange(entry.startSec, entry.endSec)}
          </p>
        </div>
      </div>
    </div>
  )
}

function SortableSopSceneCard({
  entry,
  meta,
  widthPct,
}: {
  entry: VisualTimelineEntry
  meta?: StoryboardScene
  widthPct: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.sceneId,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    flexBasis: `${widthPct}%`,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="shrink-0">
      <SopSceneCard
        entry={entry}
        meta={meta}
        isDragging={isDragging}
        dragHandle={
          <button
            type="button"
            className="mt-0.5 p-0.5 rounded text-luxe/35 hover:text-gold-300/80 cursor-grab active:cursor-grabbing touch-none"
            aria-label={`Reorder scene ${entry.index}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3 h-3" />
          </button>
        }
      />
    </div>
  )
}

export function SopSceneKanban({
  timeline,
  storyboardScenes = [],
  totalDuration,
  interactive = false,
  onReorder,
  className,
}: {
  timeline: VisualTimelineEntry[]
  storyboardScenes?: StoryboardScene[]
  totalDuration: number
  interactive?: boolean
  onReorder?: (activeId: string, overId: string) => void
  className?: string
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sceneMetaById = useMemo(() => {
    const map = new Map<string, StoryboardScene>()
    storyboardScenes.forEach((s) => map.set(s.id, s))
    return map
  }, [storyboardScenes])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  if (timeline.length < 1) return null

  const activeEntry = activeId ? timeline.find((e) => e.sceneId === activeId) : null

  const renderWidth = (entry: VisualTimelineEntry) =>
    Math.max(8, ((entry.endSec - entry.startSec) / Math.max(totalDuration, 1)) * 100)

  if (!interactive || !onReorder) {
    return (
      <div className={cn('mt-3 flex gap-1 overflow-x-auto scrollbar-luxe pb-1', className)}>
        {timeline.map((entry) => (
          <div key={entry.sceneId} style={{ flexBasis: `${renderWidth(entry)}%` }}>
            <SopSceneCard entry={entry} meta={sceneMetaById.get(entry.sceneId)} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragEnd={(event: DragEndEvent) => {
        setActiveId(null)
        const { active, over } = event
        if (!over || active.id === over.id) return
        onReorder(String(active.id), String(over.id))
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext
        items={timeline.map((e) => e.sceneId)}
        strategy={horizontalListSortingStrategy}
      >
        <div className={cn('mt-3 flex gap-1 overflow-x-auto scrollbar-luxe pb-1', className)}>
          {timeline.map((entry) => (
            <SortableSopSceneCard
              key={entry.sceneId}
              entry={entry}
              meta={sceneMetaById.get(entry.sceneId)}
              widthPct={renderWidth(entry)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeEntry ? (
          <SopSceneCard
            entry={activeEntry}
            meta={sceneMetaById.get(activeEntry.sceneId)}
            isDragging
            dragHandle={<GripVertical className="w-3 h-3 text-gold-300/70 mt-0.5" />}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
