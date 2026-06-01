'use client'

import { useCallback, useState } from 'react'
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
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import type { TimelineProject } from '@/types/timeline'
import { SceneTrackBlock } from '@/components/timeline/scene-track-block'
import { TimelineRuler } from '@/components/timeline/timeline-ruler'
import { TimelineZoomControls } from '@/components/timeline/timeline-zoom-controls'

type TimelineEditorProps = {
  timeline: TimelineProject
  selectedSceneId: string | null
  onSelectScene: (id: string) => void
  onReorder: (activeId: string, overId: string) => void
  onUpdateSceneDuration: (sceneId: string, durationSec: number) => void
  pixelsPerSec: number
  onPixelsPerSecChange: (v: number) => void
  playheadSec: number
  onPlayheadSecChange: (v: number) => void
  className?: string
}

export function TimelineEditor({
  timeline,
  selectedSceneId,
  onSelectScene,
  onReorder,
  onUpdateSceneDuration,
  pixelsPerSec,
  onPixelsPerSecChange,
  playheadSec,
  onPlayheadSecChange,
  className,
}: TimelineEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const sceneIds = timeline.scenes.map((s) => s.id)
  const trackWidth = Math.max(320, timeline.totalDurationSec * pixelsPerSec)
  const activeScene = activeId
    ? timeline.scenes.find((s) => s.id === activeId)
    : null

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return
      onReorder(String(active.id), String(over.id))
    },
    [onReorder]
  )

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/40 overflow-hidden',
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/70">
          Timeline
        </p>
        <TimelineZoomControls
          pixelsPerSec={pixelsPerSec}
          onChange={onPixelsPerSecChange}
        />
      </div>

      <div
        className="overflow-x-auto overflow-y-hidden"
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const x = e.clientX - rect.left + (e.currentTarget as HTMLElement).scrollLeft
          onPlayheadSecChange(
            Math.max(0, Math.min(timeline.totalDurationSec, x / pixelsPerSec))
          )
        }}
      >
        <TimelineRuler
          totalDurationSec={timeline.totalDurationSec}
          pixelsPerSec={pixelsPerSec}
          playheadSec={playheadSec}
        />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sceneIds} strategy={horizontalListSortingStrategy}>
            <div
              className="flex gap-1 p-3 min-h-[5.5rem]"
              style={{ width: trackWidth }}
            >
              {timeline.scenes.map((scene) => (
                <SceneTrackBlock
                  key={scene.id}
                  scene={scene}
                  pixelsPerSec={pixelsPerSec}
                  selected={selectedSceneId === scene.id}
                  onSelect={() => onSelectScene(scene.id)}
                  onTrimDuration={(durationSec) =>
                    onUpdateSceneDuration(scene.id, durationSec)
                  }
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeScene ? (
              <div
                className="h-16 rounded-lg border border-gold-500/40 bg-black/80 opacity-90"
                style={{ width: activeScene.durationSec * pixelsPerSec }}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
