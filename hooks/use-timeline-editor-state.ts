'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { reorderSceneIds, reorderScenesByIds } from '@/lib/cinematic/quick-cut/reorder-scenes'
import { loadProject } from '@/lib/cinematic-projects'
import {
  applyTimelineToStore,
  buildTimelineFromQuickCutStore,
  parseTimelineProject,
  type TimelineProject,
  type TimelineResolutionPreset,
  type TimelineSceneClip,
  type TimelineTransition,
  type TimelineCaptionStyle,
} from '@/types/timeline'
import type { MotionPresetId } from '@/lib/motion/motion-presets'

export function useTimelineEditorState(projectId?: string) {
  const storeScenes = useQuickCutGenerationStore((s) => s.scenes)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const title = useQuickCutGenerationStore((s) => s.title)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const voiceMetadata = useQuickCutGenerationStore((s) => s.voiceMetadata)
  const script = useQuickCutGenerationStore((s) => s.script)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const sceneMotion = useQuickCutGenerationStore((s) => s.sceneMotion)
  const sceneBlueprints = useQuickCutGenerationStore((s) => s.sceneBlueprints)
  const outputAlignmentControls = useQuickCutGenerationStore((s) => s.outputAlignmentControls)
  const reelTimeline = useQuickCutGenerationStore((s) => s.reelTimeline)
  const loadSavedProject = useQuickCutGenerationStore((s) => s.loadSavedProject)
  const saveProject = useQuickCutGenerationStore((s) => s.saveProject)
  const reorderScenes = useQuickCutGenerationStore((s) => s.reorderScenes)
  const regenerateSceneImage = useQuickCutGenerationStore((s) => s.regenerateSceneImage)
  const setSceneMotionPreset = useQuickCutGenerationStore((s) => s.setSceneMotionPreset)
  const composeReelTimeline = useQuickCutGenerationStore((s) => s.composeReelTimeline)

  const [timeline, setTimeline] = useState<TimelineProject | null>(null)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [pixelsPerSec, setPixelsPerSec] = useState(48)
  const [playheadSec, setPlayheadSec] = useState(0)
  const [hydrating, setHydrating] = useState(Boolean(projectId))

  const effectiveProjectId = projectId ?? savedProjectId ?? null

  const syncFromStore = useCallback(() => {
    const built = buildTimelineFromQuickCutStore({
      savedProjectId: effectiveProjectId,
      title,
      scenes: storeScenes,
      voiceUrl,
      voiceMetadata,
      script,
      duration,
      sceneMotion,
      sceneBlueprints,
      outputAlignmentControls,
      reelTimeline,
      resolutionPreset: timeline?.resolution.preset,
    })
    if (built) {
      setTimeline(built)
      if (!selectedSceneId && built.scenes[0]) {
        setSelectedSceneId(built.scenes[0].id)
      }
    }
  }, [
    effectiveProjectId,
    title,
    storeScenes,
    voiceUrl,
    voiceMetadata,
    script,
    duration,
    sceneMotion,
    sceneBlueprints,
    outputAlignmentControls,
    reelTimeline,
    timeline?.resolution.preset,
    selectedSceneId,
  ])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (!projectId) {
        syncFromStore()
        setHydrating(false)
        return
      }
      setHydrating(true)
      const ok = await loadSavedProject(projectId, { stageTab: 'visuals' })
      if (cancelled) return
      if (!ok) {
        setHydrating(false)
        return
      }
      try {
        const row = await loadProject(projectId)
        const parsed = parseTimelineProject(
          (row as { timeline_json?: unknown }).timeline_json
        )
        const currentScenes = useQuickCutGenerationStore.getState().scenes
        if (parsed) {
          const patch = applyTimelineToStore(parsed, currentScenes)
          useQuickCutGenerationStore.setState({
            scenes: patch.scenes,
            storyboard: patch.scenes,
            sceneMotion: patch.sceneMotion,
            reelTimeline: patch.reelTimeline,
            duration: patch.duration,
          })
          setTimeline(patch.timelineJson)
          setSelectedSceneId(patch.timelineJson.scenes[0]?.id ?? null)
        } else {
          const built = buildTimelineFromQuickCutStore({
            savedProjectId: projectId,
            title: useQuickCutGenerationStore.getState().title,
            scenes: currentScenes,
            voiceUrl: useQuickCutGenerationStore.getState().voiceUrl,
            voiceMetadata: useQuickCutGenerationStore.getState().voiceMetadata,
            script: useQuickCutGenerationStore.getState().script,
            duration: useQuickCutGenerationStore.getState().duration,
            sceneMotion: useQuickCutGenerationStore.getState().sceneMotion,
            sceneBlueprints: useQuickCutGenerationStore.getState().sceneBlueprints,
            outputAlignmentControls:
              useQuickCutGenerationStore.getState().outputAlignmentControls,
            reelTimeline: useQuickCutGenerationStore.getState().reelTimeline,
          })
          if (built) {
            setTimeline(built)
            setSelectedSceneId(built.scenes[0]?.id ?? null)
          }
        }
      } catch {
        syncFromStore()
      }
      setHydrating(false)
    }
    void hydrate()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per projectId
  }, [projectId])

  useEffect(() => {
    if (!projectId && storeScenes.length > 0 && !timeline) {
      syncFromStore()
    }
  }, [projectId, storeScenes.length, timeline, syncFromStore])

  const applyTimeline = useCallback(
    (next: TimelineProject) => {
      setTimeline(next)
      const patch = applyTimelineToStore(next, storeScenes)
      useQuickCutGenerationStore.setState({
        scenes: patch.scenes,
        storyboard: patch.scenes,
        sceneMotion: patch.sceneMotion,
        reelTimeline: patch.reelTimeline,
        duration: patch.duration,
      })
    },
    [storeScenes]
  )

  const updateScene = useCallback(
    (sceneId: string, patch: Partial<TimelineSceneClip>) => {
      if (!timeline) return
      const scenes = timeline.scenes.map((s) =>
        s.id === sceneId ? { ...s, ...patch } : s
      )
      applyTimeline({
        ...timeline,
        scenes,
        totalDurationSec: scenes.reduce((sum, s) => sum + s.durationSec, 0),
      })
    },
    [timeline, applyTimeline]
  )

  const handleReorder = useCallback(
    (activeId: string, overId: string) => {
      if (!timeline) return
      reorderScenes(activeId, overId)
      const orderedIds = reorderSceneIds(
        timeline.scenes.map((s) => s.id),
        activeId,
        overId
      )
      if (!orderedIds) return
      const reordered = reorderScenesByIds(storeScenes, [], orderedIds)
      const idOrder = new Map(orderedIds.map((id, i) => [id, i]))
      const scenes = [...timeline.scenes]
        .sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))
        .map((s, order) => ({ ...s, order }))
      applyTimeline({
        ...timeline,
        scenes,
      })
      composeReelTimeline()
    },
    [timeline, reorderScenes, storeScenes, applyTimeline, composeReelTimeline]
  )

  const selectedScene = useMemo(
    () => timeline?.scenes.find((s) => s.id === selectedSceneId) ?? null,
    [timeline, selectedSceneId]
  )

  const setResolution = useCallback(
    (preset: TimelineResolutionPreset) => {
      if (!timeline) return
      const dims = {
        '1080x1920': { width: 1080, height: 1920 },
        '720x1280': { width: 720, height: 1280 },
        '1080x1080': { width: 1080, height: 1080 },
        '1920x1080': { width: 1920, height: 1080 },
      }[preset]
      applyTimeline({
        ...timeline,
        resolution: { ...dims, preset },
      })
    },
    [timeline, applyTimeline]
  )

  const setTransition = useCallback(
    (sceneId: string, transition: TimelineTransition) => {
      updateScene(sceneId, { transition })
    },
    [updateScene]
  )

  const setMotionPreset = useCallback(
    (sceneId: string, presetId: MotionPresetId) => {
      setSceneMotionPreset(sceneId, presetId)
      updateScene(sceneId, { motionPresetId: presetId })
    },
    [setSceneMotionPreset, updateScene]
  )

  const setCaptionStyle = useCallback(
    (style: TimelineCaptionStyle) => {
      if (!timeline) return
      applyTimeline({
        ...timeline,
        captionTracks: timeline.captionTracks.map((c) => ({ ...c, style })),
      })
    },
    [timeline, applyTimeline]
  )

  const persist = useCallback(async () => {
    await saveProject()
  }, [saveProject])

  return {
    timeline,
    selectedSceneId,
    setSelectedSceneId,
    selectedScene,
    pixelsPerSec,
    setPixelsPerSec,
    playheadSec,
    setPlayheadSec,
    hydrating,
    effectiveProjectId,
    updateScene,
    handleReorder,
    setResolution,
    setTransition,
    setMotionPreset,
    setCaptionStyle,
    regenerateSceneImage,
    persist,
    syncFromStore,
  }
}
