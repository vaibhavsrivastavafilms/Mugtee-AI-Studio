'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  Clapperboard,
  GripVertical,
  ImageIcon,
  Loader2,
  Mic,
  Scissors,
  Sparkles,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { V3PipelineStageId } from '@/lib/pipeline/v3-types'
import { V3_STAGE_ORDER } from '@/lib/pipeline/v3-types'
import { ReelComposer } from '@/components/reel-composer/ReelComposer'

type CreatorEditorProps = {
  className?: string
  /** Show V3 pipeline stage progress when flag enabled */
  showV3Stages?: boolean
}

function SceneEditorCard({
  scene,
  index,
  duration,
  isRegenerating,
  onRegenImage,
  onRegenVoice,
  onTrim,
  dragHandle,
  isDragging,
}: {
  scene: GeneratedScene
  index: number
  duration: number
  isRegenerating: boolean
  onRegenImage: () => void
  onRegenVoice: () => void
  onTrim: (delta: number) => void
  dragHandle?: React.ReactNode
  isDragging?: boolean
}) {
  const preview = scene.imageUrl

  return (
    <div
      className={cn(
        'shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden min-w-[140px] max-w-[180px]',
        isDragging && 'border-gold-500/40 shadow-gold-glow ring-1 ring-gold-500/20'
      )}
    >
      <div className="relative aspect-[9/16] bg-black/40">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={scene.title || `Scene ${index + 1}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-luxe/30">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        {isRegenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="h-5 w-5 animate-spin text-gold-300" />
          </div>
        )}
        <span className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] tracking-wider uppercase text-gold-300/90">
          {index + 1}
        </span>
      </div>

      <div className="p-2 space-y-2">
        <div className="flex items-start gap-1">
          {dragHandle}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-luxe/80 truncate">
              {scene.title || `Scene ${index + 1}`}
            </p>
            <p className="text-[9px] text-luxe/40 tabular-nums">{duration.toFixed(1)}s</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onTrim(-0.5)}
            className="flex-1 rounded border border-white/[0.08] bg-white/[0.02] py-1 text-[9px] text-luxe/60 hover:border-gold-500/30 hover:text-gold-200 transition"
            title="Trim shorter"
          >
            <Scissors className="h-3 w-3 mx-auto" />
          </button>
          <button
            type="button"
            onClick={() => onTrim(0.5)}
            className="flex-1 rounded border border-white/[0.08] bg-white/[0.02] py-1 text-[9px] text-luxe/60 hover:border-gold-500/30 hover:text-gold-200 transition"
            title="Extend duration"
          >
            +
          </button>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={onRegenImage}
            disabled={isRegenerating}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-gold-500/20 bg-gold-500/[0.06] py-1 text-[9px] text-gold-200/90 hover:bg-gold-500/15 transition disabled:opacity-50"
          >
            <ImageIcon className="h-3 w-3" />
            Scene
          </button>
          <button
            type="button"
            onClick={onRegenVoice}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-white/[0.08] bg-white/[0.02] py-1 text-[9px] text-luxe/70 hover:border-gold-500/30 hover:text-gold-200 transition"
          >
            <Mic className="h-3 w-3" />
            Voice
          </button>
        </div>
      </div>
    </div>
  )
}

function SortableSceneCard(props: Omit<Parameters<typeof SceneEditorCard>[0], 'dragHandle' | 'isDragging'> & { sceneId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.sceneId,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <SceneEditorCard
        {...props}
        isDragging={isDragging}
        dragHandle={
          <button
            type="button"
            className="mt-0.5 touch-none text-luxe/30 hover:text-gold-300/80 cursor-grab active:cursor-grabbing"
            aria-label="Reorder scene"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        }
      />
    </div>
  )
}

function V3StageStrip({
  completedStages,
  currentStage,
}: {
  completedStages: V3PipelineStageId[]
  currentStage: V3PipelineStageId | null
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {V3_STAGE_ORDER.map((stage) => {
        const done = completedStages.includes(stage)
        const active = currentStage === stage
        const label = stage.replace(/_/g, ' ')
        return (
          <span
            key={stage}
            className={cn(
              'rounded-full px-2 py-0.5 text-[8px] tracking-wider uppercase border',
              done && 'border-gold-500/30 bg-gold-500/10 text-gold-200/90',
              active && !done && 'border-gold-400/50 bg-gold-500/20 text-gold-100 animate-pulse',
              !done && !active && 'border-white/[0.06] text-luxe/35'
            )}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

/** CapCut-style creator editor — reorder, trim, regen scene/voice only. */
export function CreatorEditor({ className, showV3Stages = true }: CreatorEditorProps) {
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const reelTimeline = useQuickCutGenerationStore((s) => s.reelTimeline)
  const regeneratingSceneIds = useQuickCutGenerationStore((s) => s.regeneratingSceneIds)
  const isRegeneratingVoice = useQuickCutGenerationStore((s) => s.isRegeneratingVoice)
  const v3PipelineEnabled = useQuickCutGenerationStore((s) => s.v3PipelineEnabled)
  const v3PipelineState = useQuickCutGenerationStore((s) => s.v3PipelineState)

  const reorderScenes = useQuickCutGenerationStore((s) => s.reorderScenes)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const regenerateVoice = useQuickCutGenerationStore((s) => s.regenerateVoice)
  const updateReelTimelineClip = useQuickCutGenerationStore((s) => s.updateReelTimelineClip)
  const composeReelTimeline = useQuickCutGenerationStore((s) => s.composeReelTimeline)

  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const sceneIds = useMemo(() => scenes.map((s) => s.id), [scenes])

  const durationByScene = useMemo(() => {
    const map = new Map<string, number>()
    if (reelTimeline) {
      for (const clip of reelTimeline.clips) {
        map.set(clip.sceneId, clip.duration)
      }
    }
    for (const scene of scenes) {
      if (!map.has(scene.id)) map.set(scene.id, scene.duration ?? 4)
    }
    return map
  }, [scenes, reelTimeline])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return
      reorderScenes(String(active.id), String(over.id))
      composeReelTimeline()
    },
    [reorderScenes, composeReelTimeline]
  )

  const handleTrim = useCallback(
    (sceneId: string, delta: number) => {
      const current = durationByScene.get(sceneId) ?? 4
      const next = Math.max(1.5, Math.min(12, current + delta))
      updateReelTimelineClip(sceneId, { duration: next })
      composeReelTimeline()
    },
    [durationByScene, updateReelTimelineClip, composeReelTimeline]
  )

  const activeScene = activeId ? scenes.find((s) => s.id === activeId) : null
  const activeIndex = activeScene ? scenes.indexOf(activeScene) : -1

  if (scenes.length === 0) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center',
          className
        )}
      >
        <Clapperboard className="mx-auto h-8 w-8 text-luxe/25 mb-3" />
        <p className="text-sm text-luxe/50">Generate a reel to open the Creator Editor.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-400/80" />
          <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold-300/90">
            Creator Editor
          </h2>
        </div>
        {isRegeneratingVoice && (
          <span className="text-[10px] text-gold-300/70 inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Regenerating voice…
          </span>
        )}
      </div>

      {showV3Stages && v3PipelineEnabled && (
        <V3StageStrip
          completedStages={v3PipelineState.completedStages}
          currentStage={v3PipelineState.currentStage}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sceneIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {scenes.map((scene, index) => (
              <SortableSceneCard
                key={scene.id}
                sceneId={scene.id}
                scene={scene}
                index={index}
                duration={durationByScene.get(scene.id) ?? scene.duration ?? 4}
                isRegenerating={regeneratingSceneIds.includes(scene.id)}
                onRegenImage={() => void regenerateSceneImage(scene.id)}
                onRegenVoice={() => void regenerateVoice()}
                onTrim={(delta) => handleTrim(scene.id, delta)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeScene && activeIndex >= 0 ? (
            <SceneEditorCard
              scene={activeScene}
              index={activeIndex}
              duration={durationByScene.get(activeScene.id) ?? activeScene.duration ?? 4}
              isRegenerating={false}
              onRegenImage={() => undefined}
              onRegenVoice={() => undefined}
              onTrim={() => undefined}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {reelTimeline && (
        <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
          <ReelComposer timeline={reelTimeline} showDirectorTracks />
        </div>
      )}
    </div>
  )
}
