import type { V7ScriptDocument } from '@/agents/v7/script-schema'
import { validateScreenplayDocument } from '@/agents/v7/script-schema'
import type { V7ScriptScene } from '@/lib/v7/scene-grounding.server'
import type { ScriptVersionRecord } from '@/lib/v7/workspace/workspace-state.core'

export type ScriptReviewScene = {
  number: number
  title: string
  narration: string
  action: string
  dialogue: string
  camera: string
  lighting: string
  duration: number
  location: string
  characters: string[]
}

export type ScriptReviewPayload = {
  title: string | null
  hook: string | null
  callToAction: string | null
  durationSec: number | null
  scenes: ScriptReviewScene[]
  versionId: string | null
  versions: ScriptVersionRecord[]
}

export function extractScriptFromStageOutput(output: unknown): V7ScriptDocument | null {
  if (!output || typeof output !== 'object') return null
  const script = (output as { script?: unknown }).script
  const validated = validateScreenplayDocument(script)
  return validated.ok ? validated.data : null
}

export function buildScriptReviewPayload(params: {
  script: V7ScriptDocument | null
  sceneRows: Array<{ number: number; script: Record<string, unknown> }>
  briefTitle?: string | null
  hook?: string | null
  callToAction?: string | null
  durationSec?: number | null
  versionId?: string | null
  versions?: ScriptVersionRecord[]
}): ScriptReviewPayload {
  const scenes: ScriptReviewScene[] = []

  if (params.script?.scenes?.length) {
    for (const scene of params.script.scenes) {
      scenes.push(mapScriptScene(scene))
    }
  } else {
    for (const row of params.sceneRows) {
      const validated = validateScreenplayDocument({ scenes: [row.script] })
      if (validated.ok) {
        scenes.push(mapScriptScene(validated.data.scenes[0]!))
      }
    }
    scenes.sort((a, b) => a.number - b.number)
  }

  return {
    title: params.briefTitle ?? null,
    hook: params.hook ?? null,
    callToAction: params.callToAction ?? null,
    durationSec: params.durationSec ?? null,
    scenes,
    versionId: params.versionId ?? null,
    versions: params.versions ?? [],
  }
}

function mapScriptScene(scene: V7ScriptScene): ScriptReviewScene {
  return {
    number: scene.number,
    title: scene.title,
    narration: scene.narration,
    action: scene.action,
    dialogue: scene.dialogue,
    camera: scene.camera,
    lighting: scene.lighting,
    duration: scene.duration,
    location: scene.location,
    characters: scene.characters ?? [],
  }
}

export function applyScriptSceneEdits(
  script: V7ScriptDocument,
  edits: Array<Partial<ScriptReviewScene> & { number: number }>
): V7ScriptDocument {
  const byNumber = new Map(edits.map((edit) => [edit.number, edit]))
  return {
    scenes: script.scenes.map((scene) => {
      const patch = byNumber.get(scene.number)
      if (!patch) return scene
      return {
        ...scene,
        title: patch.title ?? scene.title,
        narration: patch.narration ?? scene.narration,
        action: patch.action ?? scene.action,
        dialogue: patch.dialogue ?? scene.dialogue,
        camera: patch.camera ?? scene.camera,
        lighting: patch.lighting ?? scene.lighting,
        duration: patch.duration ?? scene.duration,
        location: patch.location ?? scene.location,
        characters: patch.characters ?? scene.characters,
      }
    }),
  }
}

export function createScriptVersionId(): string {
  return `sv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function scriptToDownloadText(review: ScriptReviewPayload): string {
  const lines: string[] = []
  if (review.title) lines.push(`# ${review.title}`, '')
  if (review.hook) lines.push(`Hook: ${review.hook}`, '')
  if (review.durationSec) lines.push(`Duration: ${review.durationSec}s`, '')
  if (review.callToAction) lines.push(`CTA: ${review.callToAction}`, '')
  lines.push('')

  for (const scene of review.scenes) {
    lines.push(`## Scene ${String(scene.number).padStart(2, '0')} — ${scene.title}`)
    lines.push(`Location: ${scene.location}`)
    lines.push(`Duration: ${scene.duration}s`)
    if (scene.characters.length) lines.push(`Characters: ${scene.characters.join(', ')}`)
    lines.push('')
    lines.push('Narration:')
    lines.push(scene.narration)
    lines.push('')
    lines.push('Visual:')
    lines.push(scene.action)
    if (scene.dialogue.trim()) {
      lines.push('')
      lines.push('Dialogue:')
      lines.push(scene.dialogue)
    }
    lines.push('')
    lines.push(`Camera: ${scene.camera}`)
    lines.push(`Lighting: ${scene.lighting}`)
    lines.push('')
  }

  return lines.join('\n').trim()
}
