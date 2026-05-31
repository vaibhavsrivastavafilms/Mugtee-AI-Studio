import type { ScriptBeat } from '@/types/cinematic-script'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { replaceSelectionInText } from '@/lib/rewrite/replace-text'
import type { RewriteContentType, RewriteVariant } from '@/lib/rewrite/rewrite-actions'

export type QuickCutRewriteTarget =
  | { field: 'hook' }
  | { field: 'script' }
  | { field: 'payoff' }
  | { field: 'cta' }
  | { field: 'scriptBeat'; index: number }
  | { field: 'scene'; index: number; key: 'description' | 'imagePrompt' | 'cameraAngle' }

export function locateQuickCutRewriteTarget(input: {
  original: string
  contentType: RewriteContentType
  hook: string
  script: string
  scriptBeats: ScriptBeat[]
  payoff: string
  cta: string
  scenes: Array<Pick<GeneratedScene, 'description' | 'imagePrompt' | 'cameraAngle'>>
}): QuickCutRewriteTarget | null {
  const { original, contentType } = input

  if (contentType === 'hook' && input.hook.includes(original)) {
    return { field: 'hook' }
  }

  if (contentType === 'caption') {
    if (input.cta.includes(original)) return { field: 'cta' }
    if (input.payoff.includes(original)) return { field: 'payoff' }
  }

  if (contentType === 'scene' || contentType === 'visual_direction') {
    for (let i = 0; i < input.scenes.length; i++) {
      const scene = input.scenes[i]
      if (scene.description?.includes(original)) {
        return { field: 'scene', index: i, key: 'description' }
      }
      if (scene.imagePrompt?.includes(original)) {
        return { field: 'scene', index: i, key: 'imagePrompt' }
      }
      if (scene.cameraAngle?.includes(original)) {
        return { field: 'scene', index: i, key: 'cameraAngle' }
      }
    }
  }

  const beatIndex = input.scriptBeats.findIndex((b) => b.narration?.includes(original))
  if (beatIndex >= 0) return { field: 'scriptBeat', index: beatIndex }

  if (input.payoff.includes(original)) return { field: 'payoff' }
  if (input.cta.includes(original)) return { field: 'cta' }
  if (input.hook.includes(original)) return { field: 'hook' }
  if (input.script.includes(original)) return { field: 'script' }

  return { field: 'script' }
}

export type QuickCutRewritePatch = {
  hook?: string
  script?: string
  scriptBeats?: ScriptBeat[]
  payoff?: string
  cta?: string
  scenes?: GeneratedScene[]
}

export function buildQuickCutRewritePatch(
  state: {
    hook: string
    script: string
    scriptBeats: ScriptBeat[]
    payoff: string
    cta: string
    scenes: GeneratedScene[]
  },
  original: string,
  replacement: string,
  contentType: RewriteContentType,
  _variant: RewriteVariant
): QuickCutRewritePatch {
  const target = locateQuickCutRewriteTarget({ ...state, original, contentType })
  if (!target) return {}

  switch (target.field) {
    case 'hook':
      return { hook: replaceSelectionInText(state.hook, original, replacement) }
    case 'script':
      return { script: replaceSelectionInText(state.script, original, replacement) }
    case 'payoff':
      return { payoff: replaceSelectionInText(state.payoff, original, replacement) }
    case 'cta':
      return { cta: replaceSelectionInText(state.cta, original, replacement) }
    case 'scriptBeat': {
      const scriptBeats = state.scriptBeats.map((beat, i) =>
        i === target.index
          ? { ...beat, narration: replaceSelectionInText(beat.narration, original, replacement) }
          : beat
      )
      return { scriptBeats }
    }
    case 'scene': {
      const scenes = state.scenes.map((scene, i) => {
        if (i !== target.index) return scene
        const key = target.key
        const current = String(scene[key] || '')
        return { ...scene, [key]: replaceSelectionInText(current, original, replacement) }
      })
      return { scenes }
    }
    default:
      return {}
  }
}
