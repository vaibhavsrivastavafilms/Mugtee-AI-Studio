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
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { directorBtnPrimary } from '@/lib/studio/director-mode-tokens'
import { StudioSceneCard } from '@/components/studio/studio-scene-card'
import { DeepResearchPanel } from '@/components/quick-cut/deep-research-panel'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { toast } from 'sonner'

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function SortableSceneRow({
  scene,
  index,
  total,
  selected,
  loading,
  onSelect,
  onRegenerate,
}: {
  scene: GeneratedScene
  index: number
  total: number
  selected: boolean
  loading: boolean
  onSelect: () => void
  onRegenerate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex gap-1 items-stretch">
      <button
        type="button"
        className="shrink-0 self-center p-1 rounded text-luxe/30 hover:text-luxe/60 cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Reorder scene ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <StudioSceneCard
          scene={scene}
          index={index}
          total={total}
          selected={selected}
          loading={loading}
          onSelect={onSelect}
          onRegenerate={onRegenerate}
        />
      </div>
    </div>
  )
}

type WorkflowContextPanelProps = {
  className?: string
}

export function WorkflowContextPanel({ className }: WorkflowContextPanelProps) {
  const activeStage = useStudioWorkspaceStore((s) => s.activeStage)
  const activeSceneIndex = useStudioWorkspaceStore((s) => s.activeSceneIndex)
  const setActiveSceneIndex = useStudioWorkspaceStore((s) => s.setActiveSceneIndex)

  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const regenerateScript = useQuickCutGenerationStore((s) => s.regenerateScript)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)
  const reorderScenes = useQuickCutGenerationStore((s) => s.reorderScenes)
  const researchReport = useQuickCutGenerationStore((s) => s.researchReport)
  const researchDocument = useQuickCutGenerationStore((s) => s.researchDocument)
  const researchMock = useQuickCutGenerationStore((s) => s.researchMock)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)

  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const showSceneList = ['scenes', 'storyboard', 'script', 'motion', 'voice', 'timeline'].includes(
    activeStage
  )

  const handleAddScene = useCallback(async () => {
    if (isGenerating) return
    if (scenes.length === 0) {
      void resumeGeneration()
      return
    }
    toast.message('Adding scenes', { description: 'Refreshing script beats…' })
    await regenerateScript()
  }, [isGenerating, scenes.length, resumeGeneration, regenerateScript])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return
      reorderScenes(String(active.id), String(over.id))
    },
    [reorderScenes]
  )

  if (activeStage === 'research') {
    return (
      <aside
        className={cn(
          'hidden lg:flex flex-col w-[340px] shrink-0 min-h-0 bg-[#0D0D0D] border-r border-white/[0.06]',
          className
        )}
      >
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <p className="text-[10px] tracking-[0.22em] uppercase text-director-primary font-semibold">
            Research
          </p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-luxe p-4">
          {researchReport || researchDocument ? (
            <DeepResearchPanel
              document={researchDocument}
              report={researchReport}
              mock={researchMock}
            />
          ) : (
            <p className="text-[12px] text-luxe/50 italic">
              Research populates during generation when enabled.
            </p>
          )}
        </div>
      </aside>
    )
  }

  if (!showSceneList) {
    return (
      <aside
        className={cn(
          'hidden lg:flex flex-col w-[340px] shrink-0 min-h-0 bg-[#0D0D0D] border-r border-white/[0.06]',
          className
        )}
      >
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <p className="text-[10px] tracking-[0.22em] uppercase text-luxe/40">Context</p>
          <p className="text-[13px] text-luxe/70 mt-1 capitalize">{activeStage}</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-luxe p-4 space-y-3 text-[12px] text-luxe/55">
          {hook.trim() ? (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-luxe/40 mb-1">Hook</p>
              <p className="line-clamp-4">{hook}</p>
            </div>
          ) : null}
          {script.trim() ? (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-luxe/40 mb-1">Script</p>
              <p className="line-clamp-6 whitespace-pre-wrap">{script}</p>
            </div>
          ) : null}
          {!hook.trim() && !script.trim() ? (
            <p className="italic">Generate a project to unlock scene context.</p>
          ) : null}
        </div>
      </aside>
    )
  }

  const imagesLoading = generationStep === 'images' || generationStep === 'scenes'
  const activeScene = activeDragId ? scenes.find((s) => s.id === activeDragId) : null

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-[340px] shrink-0 min-h-0 bg-[#0D0D0D] border-r border-white/[0.06]',
        className
      )}
      aria-label="Scene list"
    >
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-director-primary font-semibold">
              Scenes
            </p>
            <p className="text-[11px] text-luxe/45 mt-0.5 tabular-nums">
              {scenes.length} Scenes · {formatDuration(duration)} Duration
            </p>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleAddScene()}
            className={cn(directorBtnPrimary, 'h-8')}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Scene
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveDragId(String(e.active.id))}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe px-3 py-2 space-y-2">
            {scenes.length === 0 ? (
              <p className="text-[12px] text-luxe/50 italic py-8 text-center">
                {imagesLoading ? 'Structuring scenes…' : 'Generate a script to unlock scenes.'}
              </p>
            ) : (
              scenes.map((scene, i) => (
                <SortableSceneRow
                  key={scene.id || i}
                  scene={scene}
                  index={i}
                  total={scenes.length}
                  selected={activeSceneIndex === i}
                  loading={regeneratingId === scene.id || (imagesLoading && !scene.imageUrl)}
                  onSelect={() => setActiveSceneIndex(i)}
                  onRegenerate={() => {
                    if (!scene.id || isGenerating) return
                    setRegeneratingId(scene.id)
                    void regenerateSceneImage(scene.id).finally(() => setRegeneratingId(null))
                  }}
                />
              ))
            )}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeScene ? (
            <StudioSceneCard
              scene={activeScene}
              index={scenes.indexOf(activeScene)}
              total={scenes.length}
              selected
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="shrink-0 px-4 py-3 border-t border-white/[0.06]">
        <button
          type="button"
          disabled={isGenerating}
          onClick={() => void handleAddScene()}
          className="w-full text-[11px] tracking-[0.12em] uppercase text-luxe/50 hover:text-director-primary transition disabled:opacity-40"
        >
          + Add New Scene
        </button>
      </div>
    </aside>
  )
}
