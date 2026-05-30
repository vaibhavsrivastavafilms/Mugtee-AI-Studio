import type { GeneratedScene } from '@/lib/cinematic/generation'

/** Single visual beat from the Storyboard SOP — one still frame per major moment. */
export interface StoryboardScene {
  id: string
  scriptLines: string
  imagePrompt: string
  visualFocus: string
  location: string
  characters: string[]
  action: string
  emotion: string
  duration: number
}

/** Timeline entry for visual pacing across storyboard scenes. */
export type VisualTimelineEntry = {
  sceneId: string
  index: number
  startSec: number
  endSec: number
  label: string
}

/** Storyboard fields persisted on Quick Cut projects and generation store. */
export type StoryboardProjectFields = {
  storyboardScenes: StoryboardScene[]
  storyboardPrompts: string[]
  sceneCount: number
  visualTimeline: VisualTimelineEntry[]
}

/** Zustand store slice for storyboard SOP output. */
export type StoryboardStoreFields = StoryboardProjectFields

export const EMPTY_STORYBOARD_FIELDS: StoryboardStoreFields = {
  storyboardScenes: [],
  storyboardPrompts: [],
  sceneCount: 0,
  visualTimeline: [],
}

export type StoryboardSceneCountRange = {
  min: number
  max: number
  target: number
}

/** Duration-based scene count — Quick Cut 60s targets 6–10 (default 8). */
export function resolveStoryboardSceneCountRange(durationSec: number): StoryboardSceneCountRange {
  const d = Math.max(1, Math.round(durationSec))
  if (d <= 30) return { min: 3, max: 5, target: 4 }
  if (d <= 60) return { min: 6, max: 10, target: 8 }
  if (d <= 120) return { min: 10, max: 16, target: 12 }
  if (d <= 600) {
    const target = Math.min(100, Math.max(60, Math.round(d / 6)))
    return { min: 60, max: 100, target }
  }
  const target = Math.min(100, Math.round(d / 6))
  return { min: target, max: target, target }
}

export function resolveStoryboardSceneCount(durationSec: number): number {
  return resolveStoryboardSceneCountRange(durationSec).target
}

/** Image prompts extracted from storyboard scenes (scene-only body, no style prefix). */
export function extractStoryboardPrompts(scenes: StoryboardScene[]): string[] {
  return scenes.map((s) => s.imagePrompt.trim()).filter(Boolean)
}

/** Build cumulative visual timeline from scene durations. */
export function buildVisualTimeline(scenes: StoryboardScene[]): VisualTimelineEntry[] {
  let cursor = 0
  return scenes.map((scene, index) => {
    const dur = Math.max(1, scene.duration || 4)
    const entry: VisualTimelineEntry = {
      sceneId: scene.id,
      index: index + 1,
      startSec: cursor,
      endSec: cursor + dur,
      label: scene.visualFocus.trim() || scene.action.trim() || `Scene ${index + 1}`,
    }
    cursor += dur
    return entry
  })
}

/** Aggregate storyboard project fields from SOP scenes. */
export function buildStoryboardProjectFields(
  scenes: StoryboardScene[]
): StoryboardProjectFields {
  return {
    storyboardScenes: scenes,
    storyboardPrompts: extractStoryboardPrompts(scenes),
    sceneCount: scenes.length,
    visualTimeline: buildVisualTimeline(scenes),
  }
}

/** Map Storyboard SOP scenes → GeneratedScene records for image gen / reel assembly. */
export function storyboardScenesToGeneratedScenes(
  scenes: StoryboardScene[]
): GeneratedScene[] {
  return scenes.map((scene, i) => ({
    id: scene.id || `scene-${i + 1}`,
    title: `Scene ${i + 1}`,
    description: scene.scriptLines,
    duration: scene.duration,
    visualPrompt: scene.imagePrompt,
    imagePrompt: scene.imagePrompt,
    cameraAngle: '',
    lightingMood: '',
    environment: scene.location,
    colorPalette: '',
    movementStyle: '',
  }))
}

/** Best-effort reverse map when only GeneratedScene[] is available. */
export function generatedScenesToStoryboardScenes(
  scenes: GeneratedScene[]
): StoryboardScene[] {
  return scenes.map((scene, i) => ({
    id: scene.id || `scene-${i + 1}`,
    scriptLines: scene.description || '',
    imagePrompt: scene.imagePrompt || scene.visualPrompt || '',
    visualFocus: scene.title || `Scene ${i + 1}`,
    location: scene.environment || '',
    characters: [],
    action: '',
    emotion: '',
    duration: scene.duration ?? 4,
  }))
}
