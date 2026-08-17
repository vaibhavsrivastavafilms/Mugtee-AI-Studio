import { randomUUID } from 'crypto'

import type { V7ScriptDocument } from '@/agents/v7/script-schema'
import type { V7ScriptScene } from '@/lib/v7/scene-grounding.server'
import type { V7ScenePackage } from '@/lib/v7/scene-package.server'

export type ContinuationContext = {
  sourceSceneId: string
  sourceSceneNumber: number
  displayLabel: string
  previousNarration: string
  previousVisual: string
  characters: string[]
  location: string
  props: string[]
  lighting: string
  mood: string
  camera: string
  environment: string
  wardrobeNotes: string
  weatherNotes: string
  timeOfDay: string
  colorPalette: string
  imageUrl: string | null
  videoUrl: string | null
  durationSec: number
}

export type ContinuationInsertPlan = {
  newSceneId: string
  insertAfterNumber: number
  newSceneNumber: number
  displaySequence: string
  scriptScene: V7ScriptScene
  renumbered: Array<{ sceneId: string; from: number; to: number }>
}

export function buildContinuationContext(params: {
  source: V7ScenePackage
  continuationIdea?: string
}): ContinuationContext {
  const { source } = params
  return {
    sourceSceneId: source.sceneId,
    sourceSceneNumber: source.sceneNumber,
    displayLabel: `Scene ${String(source.sceneNumber).padStart(2, '0')}`,
    previousNarration: source.narration,
    previousVisual: source.sceneDescription,
    characters: source.characterIds,
    location: source.environmentId,
    props: [],
    lighting: source.lighting,
    mood: source.mood,
    camera: source.cameraPlan,
    environment: source.environmentId,
    wardrobeNotes: '',
    weatherNotes: '',
    timeOfDay: '',
    colorPalette: '',
    imageUrl: source.imageUrl,
    videoUrl: source.videoUrl,
    durationSec: source.durationSec,
  }
}

export function buildContinuationScriptScene(params: {
  source: V7ScriptScene
  sourcePackage: V7ScenePackage
  continuationIdea: string
  narration?: string
  durationSec?: number
  newSceneNumber: number
}): V7ScriptScene {
  const narration =
    params.narration?.trim() ||
    `${params.source.narration.trim()} ${params.continuationIdea.trim()}`.trim()

  return {
    number: params.newSceneNumber,
    title: `Continuation of Scene ${params.source.number}`,
    duration: params.durationSec ?? params.source.duration ?? params.sourcePackage.durationSec,
    location: params.source.location,
    characters: params.source.characters ?? [],
    dialogue: '',
    action: params.continuationIdea.trim(),
    camera: params.source.camera,
    lighting: params.source.lighting,
    movement: params.source.movement,
    emotion: params.source.emotion,
    transition: 'Cut',
    narration,
  }
}

/** Apply renumbering from highest scene number first to avoid (production_id, number) collisions. */
export function orderSceneRenumberingShifts(
  renumbered: ContinuationInsertPlan['renumbered']
): ContinuationInsertPlan['renumbered'] {
  return [...renumbered].sort((a, b) => b.from - a.from)
}

export function planSceneInsertion(params: {
  scenes: Array<{ id: string; number: number; script: Record<string, unknown> }>
  afterSceneId: string
  continuationIdea: string
  narration?: string
  durationSec?: number
  sourcePackage: V7ScenePackage
}): ContinuationInsertPlan | null {
  const sourceIndex = params.scenes.findIndex((scene) => scene.id === params.afterSceneId)
  if (sourceIndex < 0) return null

  const sourceRow = params.scenes[sourceIndex]!
  const sourceScript = sourceRow.script as V7ScriptScene
  const insertAfterNumber = sourceRow.number
  const newSceneNumber = insertAfterNumber + 1
  const newSceneId = randomUUID()

  const renumbered: ContinuationInsertPlan['renumbered'] = []
  for (const scene of params.scenes) {
    if (scene.number > insertAfterNumber) {
      renumbered.push({ sceneId: scene.id, from: scene.number, to: scene.number + 1 })
    }
  }

  const scriptScene = buildContinuationScriptScene({
    source: sourceScript,
    sourcePackage: params.sourcePackage,
    continuationIdea: params.continuationIdea,
    narration: params.narration,
    durationSec: params.durationSec,
    newSceneNumber,
  })

  return {
    newSceneId,
    insertAfterNumber,
    newSceneNumber,
    displaySequence: `${String(insertAfterNumber).padStart(2, '0')}A`,
    scriptScene,
    renumbered,
  }
}

export function mergeScriptDocumentWithInsertion(params: {
  script: V7ScriptDocument
  plan: ContinuationInsertPlan
}): V7ScriptDocument {
  const renumberedNumbers = new Map(params.plan.renumbered.map((row) => [row.from, row.to]))
  const shifted = params.script.scenes.map((scene) => ({
    ...scene,
    number: renumberedNumbers.get(scene.number) ?? scene.number,
  }))

  const insertIndex = shifted.findIndex((scene) => scene.number === params.plan.newSceneNumber)
  const nextScenes =
    insertIndex >= 0
      ? [
          ...shifted.slice(0, insertIndex),
          params.plan.scriptScene,
          ...shifted.slice(insertIndex),
        ]
      : [...shifted, params.plan.scriptScene].sort((a, b) => a.number - b.number)

  return { scenes: nextScenes }
}

export function continuationPromptFromContext(context: ContinuationContext, idea: string): string {
  return [
    'Continue the previous scene with strict visual and narrative continuity.',
    `Previous narration: ${context.previousNarration}`,
    `Previous visual: ${context.previousVisual}`,
    context.characters.length ? `Characters: ${context.characters.join(', ')}` : null,
    context.location ? `Location: ${context.location}` : null,
    context.lighting ? `Lighting: ${context.lighting}` : null,
    context.mood ? `Mood: ${context.mood}` : null,
    context.camera ? `Camera: ${context.camera}` : null,
    `What happens next: ${idea.trim()}`,
  ]
    .filter(Boolean)
    .join('\n')
}
