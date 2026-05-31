import { arrayMove } from '@dnd-kit/sortable'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  buildVisualTimeline,
  type StoryboardScene,
  type VisualTimelineEntry,
} from '@/types/storyboard'

/** Build timeline entries from generated scenes when SOP metadata is absent. */
export function buildVisualTimelineFromGenerated(
  scenes: GeneratedScene[]
): VisualTimelineEntry[] {
  let cursor = 0
  return scenes.map((scene, index) => {
    const dur = Math.max(1, scene.duration ?? 4)
    const entry: VisualTimelineEntry = {
      sceneId: scene.id,
      index: index + 1,
      startSec: cursor,
      endSec: cursor + dur,
      label: scene.title?.trim() || `Scene ${index + 1}`,
    }
    cursor += dur
    return entry
  })
}

/** Reorder scenes and sync SOP storyboard metadata + visual timeline. */
export function reorderScenesByIds(
  scenes: GeneratedScene[],
  storyboardScenes: StoryboardScene[],
  orderedIds: string[]
): {
  scenes: GeneratedScene[]
  storyboardScenes: StoryboardScene[]
  visualTimeline: VisualTimelineEntry[]
} {
  const byId = new Map(scenes.map((s) => [s.id, s]))
  const reorderedScenes: GeneratedScene[] = []
  const seen = new Set<string>()

  for (const id of orderedIds) {
    const scene = byId.get(id)
    if (scene) {
      reorderedScenes.push(scene)
      seen.add(id)
    }
  }
  for (const scene of scenes) {
    if (!seen.has(scene.id)) reorderedScenes.push(scene)
  }

  const sopById = new Map(storyboardScenes.map((s) => [s.id, s]))
  const reorderedSop =
    storyboardScenes.length > 0
      ? reorderedScenes
          .map((scene) => sopById.get(scene.id))
          .filter((s): s is StoryboardScene => Boolean(s))
      : []

  const visualTimeline =
    reorderedSop.length > 0
      ? buildVisualTimeline(reorderedSop)
      : buildVisualTimelineFromGenerated(reorderedScenes)

  return {
    scenes: reorderedScenes,
    storyboardScenes: reorderedSop.length > 0 ? reorderedSop : storyboardScenes,
    visualTimeline,
  }
}

export function reorderSceneIds(
  sceneIds: string[],
  activeId: string,
  overId: string
): string[] | null {
  const oldIndex = sceneIds.indexOf(activeId)
  const newIndex = sceneIds.indexOf(overId)
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null
  return arrayMove(sceneIds, oldIndex, newIndex)
}
