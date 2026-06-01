'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimelineSceneClip } from '@/types/timeline'

type SceneTrackBlockProps = {
  scene: TimelineSceneClip
  pixelsPerSec: number
  selected: boolean
  onSelect: () => void
  onTrimDuration: (durationSec: number) => void
}

export function SceneTrackBlock({
  scene,
  pixelsPerSec,
  selected,
  onSelect,
  onTrimDuration,
}: SceneTrackBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id })

  const width = Math.max(48, scene.durationSec * pixelsPerSec)

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    width,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative shrink-0 h-16 rounded-lg border overflow-hidden cursor-pointer group',
        selected
          ? 'border-gold-500/50 ring-1 ring-gold-500/30'
          : 'border-white/[0.1] hover:border-gold-500/25',
        isDragging && 'opacity-50'
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect()
      }}
    >
      {scene.imageUrl ? (
        <Image
          src={scene.imageUrl}
          alt={scene.title ?? scene.id}
          fill
          className="object-cover"
          sizes="120px"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-white/[0.04]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
        <span className="text-[9px] text-white/90 truncate">{scene.title}</span>
        <span className="text-[8px] text-gold-200/80 tabular-nums">
          {scene.durationSec.toFixed(1)}s
        </span>
      </div>
      <button
        type="button"
        className="absolute top-1 left-1 touch-none text-white/50 hover:text-gold-200 cursor-grab active:cursor-grabbing z-10"
        aria-label="Reorder scene"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-gold-500/0 hover:bg-gold-500/40 z-10"
        aria-label="Trim scene duration"
        onMouseDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
          const startX = e.clientX
          const startDur = scene.durationSec
          const onMove = (ev: MouseEvent) => {
            const delta = (ev.clientX - startX) / pixelsPerSec
            onTrimDuration(Math.max(1.5, Math.min(15, startDur + delta)))
          }
          const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
      />
    </div>
  )
}
