'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Film, GripVertical, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { DirectorTimeline } from '@/components/reel-composer/DirectorTimeline'
import { MotionPresetSelect } from '@/components/quick-cut/motion-preset-control'
import { composeReelTimeline as buildReelTimeline } from '@/lib/reel/compose-reel-timeline'
import { canEditTimeline } from '@/lib/quick-cut/timeline-edit-guard'
import {
  motionTransitionToTimeline,
  timelineTransitionToMotion,
  type TimelineTransition,
} from '@/types/timeline'
import type { MotionPresetId } from '@/lib/motion/motion-presets'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

const TRANSITIONS: TimelineTransition[] = [
  'fade',
  'slide',
  'zoom',
  'crossDissolve',
  'cut',
]

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function SortableSceneChip({
  sceneId,
  index,
  imageUrl,
  title,
  duration,
  selected,
  onSelect,
}: {
  sceneId: string
  index: number
  imageUrl: string | null
  title: string
  duration: number
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sceneId,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        'relative shrink-0 w-[64px] rounded-lg border overflow-hidden',
        selected ? 'border-gold-400/60 ring-1 ring-gold-400/25' : 'border-white/10',
        isDragging && 'opacity-60 z-20'
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="relative w-full aspect-[9/16] block"
        aria-label={`Scene ${index + 1}`}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill sizes="64px" className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1208] to-black" />
        )}
        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[7px] text-gold-200/90 text-center py-0.5 tabular-nums">
          {duration.toFixed(1)}s
        </span>
        <span className="absolute top-0.5 left-0.5 text-[7px] bg-black/70 text-gold-200 px-1 rounded">
          {index + 1}
        </span>
      </button>
      <button
        type="button"
        className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-luxe/50 hover:text-gold-200 cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Reorder scene ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}

/** Director Timeline V3 — reorder, duration, transitions, motion, preview. */
export function DirectorTimelineV3({ className }: { className?: string }) {
  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      scenes: s.scenes,
      reelTimeline: s.reelTimeline,
      voiceUrl: s.voiceUrl,
      script: s.script,
      duration: s.duration,
      sceneMotion: s.sceneMotion,
      sceneBlueprints: s.sceneBlueprints,
      isGenerating: s.isGenerating,
      generationStep: s.generationStep,
      reorderScenes: s.reorderScenes,
      composeReelTimeline: s.composeReelTimeline,
      updateReelTimelineClip: s.updateReelTimelineClip,
      setSceneMotionPreset: s.setSceneMotionPreset,
      updateSceneMotion: s.updateSceneMotion,
    }))
  )

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playheadSec, setPlayheadSec] = useState(0)
  const [playing, setPlaying] = useState(false)

  const editable = canEditTimeline(state)

  const timeline = useMemo(() => {
    if (state.reelTimeline) return state.reelTimeline
    return buildReelTimeline({
      scenes: state.scenes,
      voiceUrl: state.voiceUrl,
      script: state.script,
      targetDurationSec: state.duration,
      sceneMotion: state.sceneMotion,
      sceneBlueprints: state.sceneBlueprints,
    })
  }, [
    state.reelTimeline,
    state.scenes,
    state.voiceUrl,
    state.script,
    state.duration,
    state.sceneMotion,
    state.sceneBlueprints,
  ])

  const composeReelTimeline = state.composeReelTimeline

  useEffect(() => {
    if (!state.reelTimeline && state.scenes.length > 0) {
      composeReelTimeline()
    }
  }, [state.reelTimeline, state.scenes.length, composeReelTimeline])

  useEffect(() => {
    if (!selectedId && state.scenes[0]) setSelectedId(state.scenes[0].id)
  }, [selectedId, state.scenes])

  const totalSec = timeline?.totalDurationSec || state.duration || 30

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setPlayheadSec((t) => {
        if (t >= totalSec) {
          setPlaying(false)
          return 0
        }
        return t + 0.25
      })
    }, 250)
    return () => window.clearInterval(id)
  }, [playing, totalSec])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const selectedScene = state.scenes.find((s) => s.id === selectedId) ?? null
  const selectedClip = timeline?.clips.find((c) => c.sceneId === selectedId)
  const selectedMotion = selectedId ? state.sceneMotion[selectedId] : undefined

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!editable || !over || active.id === over.id) return
      state.reorderScenes(String(active.id), String(over.id))
      state.composeReelTimeline()
    },
    [editable, state]
  )

  const handleDuration = useCallback(
    (sec: number) => {
      if (!selectedId || !editable) return
      const dur = Math.max(1.5, Math.min(15, sec))
      state.updateSceneMotion(selectedId, { duration: dur })
      if (state.reelTimeline) {
        state.updateReelTimelineClip(selectedId, { duration: dur })
      } else {
        state.composeReelTimeline()
      }
    },
    [selectedId, editable, state]
  )

  const handleTransition = useCallback(
    (transition: TimelineTransition) => {
      if (!selectedId || !editable) return
      const motionTransition = timelineTransitionToMotion(transition)
      state.updateSceneMotion(selectedId, { transitionType: motionTransition })
      if (state.reelTimeline) {
        state.updateReelTimelineClip(selectedId, { transition: motionTransition })
      } else {
        state.composeReelTimeline()
      }
    },
    [selectedId, editable, state]
  )

  const handleMotion = useCallback(
    (presetId: MotionPresetId) => {
      if (!selectedId || !editable) return
      state.setSceneMotionPreset(selectedId, presetId)
    },
    [selectedId, editable, state]
  )

  if (state.scenes.length < 1) return null

  const showTimeline =
    state.scenes.some((s) => s.imageUrl?.trim()) ||
    state.generationStep === 'motion' ||
    state.generationStep === 'voice' ||
    state.generationStep === 'render' ||
    state.generationStep === 'complete'

  if (!showTimeline) return null

  const currentTransition = motionTransitionToTimeline(
    selectedMotion?.transitionType ?? selectedClip?.animation.transition
  )

  return (
    <section
      className={cn(
        'rounded-xl border border-gold-500/15 bg-gradient-to-b from-black/50 to-black/30 p-3 space-y-3',
        className
      )}
      aria-label="Director timeline"
    >
      <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85 flex items-center gap-1.5">
        <Film className="w-3 h-3" aria-hidden />
        Director Timeline V3
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={state.scenes.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-2 overflow-x-auto scrollbar-luxe pb-1">
            {state.scenes.map((scene, i) => (
              <SortableSceneChip
                key={scene.id}
                sceneId={scene.id}
                index={i}
                imageUrl={scene.imageUrl?.trim() || null}
                title={scene.title || `Scene ${i + 1}`}
                duration={scene.duration ?? selectedClip?.duration ?? 4}
                selected={scene.id === selectedId}
                onSelect={() => setSelectedId(scene.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {selectedScene ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="space-y-1">
            <span className="text-[9px] tracking-[0.14em] uppercase text-luxe/45">Duration</span>
            <input
              type="range"
              min={1.5}
              max={12}
              step={0.5}
              disabled={!editable}
              value={selectedScene.duration ?? 4}
              onChange={(e) => handleDuration(Number(e.target.value))}
              className="w-full accent-gold-400 disabled:opacity-40"
            />
            <span className="text-[10px] tabular-nums text-luxe/60">
              {(selectedScene.duration ?? 4).toFixed(1)}s
            </span>
          </label>

          <label className="space-y-1">
            <span className="text-[9px] tracking-[0.14em] uppercase text-luxe/45">Transition</span>
            <select
              disabled={!editable}
              value={currentTransition}
              onChange={(e) => handleTransition(e.target.value as TimelineTransition)}
              className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-[10px] text-luxe/75 disabled:opacity-40"
            >
              {TRANSITIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[9px] tracking-[0.14em] uppercase text-luxe/45">Motion</span>
            <MotionPresetSelect
              value={selectedMotion?.presetId ?? selectedClip?.animation.presetId}
              onChange={handleMotion}
              disabled={!editable}
              className="w-full max-w-none"
            />
          </label>
        </div>
      ) : null}

      {timeline ? (
        <div className="space-y-2 rounded-lg border border-white/[0.06] bg-black/35 p-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlayheadSec((t) => Math.max(0, t - 5))}
              className="p-1 rounded text-luxe/50 hover:text-gold-200"
              aria-label="Skip back"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="p-1 rounded text-gold-200 hover:bg-gold-500/10"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setPlayheadSec((t) => Math.min(totalSec, t + 5))}
              className="p-1 rounded text-luxe/50 hover:text-gold-200"
              aria-label="Skip forward"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] tabular-nums text-luxe/55">
              {formatTime(playheadSec)} / {formatTime(totalSec)}
            </span>
            <span className="text-[9px] text-luxe/35 ml-auto">1080×1920 · 30fps</span>
          </div>
          <DirectorTimeline
            timeline={timeline}
            currentTimeSec={playheadSec}
            onSeek={(sec) => {
              setPlayheadSec(sec)
              setPlaying(false)
            }}
          />
        </div>
      ) : null}
    </section>
  )
}
