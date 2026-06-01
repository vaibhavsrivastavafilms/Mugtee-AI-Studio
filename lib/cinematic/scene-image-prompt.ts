import type {
  GeneratedScene,
  SceneImagePromptContext,
} from '@/lib/cinematic/generation'
import { sanitizeSceneOnlyPrompt } from '@/lib/ai/prompts/youtube/storyboard-sop-prompt'
import { cameraVariationDirective } from '@/lib/cinematic/visual-diversity'

/** Round timeline seconds for UI (avoids 28.270000000000003s float artifacts). */
export function roundTimelineSec(sec: number): number {
  if (!Number.isFinite(sec)) return 0
  return Math.round(sec * 100) / 100
}

/** Display range for storyboard / SOP kanban timelines. */
export function formatTimelineSecRange(startSec: number, endSec: number): string {
  return `${roundTimelineSec(startSec)}s–${roundTimelineSec(endSec)}s`
}

/** Primary beat line used to distinguish storyboard stills. */
export function sceneBeatNarration(
  scene: Pick<GeneratedScene, 'description' | 'title' | 'visualPrompt' | 'imagePrompt'>
): string {
  return (
    scene.description?.trim() ||
    scene.visualPrompt?.trim() ||
    scene.imagePrompt?.trim() ||
    scene.title?.trim() ||
    ''
  )
}

/** Stable fingerprint for duplicate prompt / image detection. */
export function imagePromptFingerprint(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}

function beatAlreadyInBody(beatLine: string, body: string): boolean {
  if (!beatLine || !body) return false
  const needle = beatLine.slice(0, 48).toLowerCase()
  return body.toLowerCase().includes(needle)
}

export type SceneImageDuplicate = {
  sceneId: string
  previousSceneId: string
  imageUrl: string
}

/** Consecutive scenes sharing the same image URL (real URLs only). */
export function findConsecutiveDuplicateSceneImages(
  scenes: Array<Pick<GeneratedScene, 'id' | 'imageUrl'>>
): SceneImageDuplicate[] {
  const out: SceneImageDuplicate[] = []
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1]
    const curr = scenes[i]
    const prevUrl = prev?.imageUrl?.trim()
    const currUrl = curr?.imageUrl?.trim()
    if (!prevUrl || !currUrl || prevUrl !== currUrl) continue
    if (prevUrl.startsWith('data:')) continue
    out.push({
      sceneId: curr?.id ?? `scene-${i + 1}`,
      previousSceneId: prev?.id ?? `scene-${i}`,
      imageUrl: currUrl,
    })
  }
  return out
}

/** Directive appended when regenerating after a duplicate still URL. */
export function duplicateImageVariationSuffix(
  sceneIndex: number,
  attempt: number
): string {
  return [
    cameraVariationDirective(sceneIndex - 1, attempt + 2),
    'Distinct composition from previous scene — different angle, subject action, and background details.',
  ].join(' ')
}

export function appendPromptSuffix(prompt: string, suffix: string): string {
  const base = prompt.trim()
  const extra = suffix.trim()
  if (!extra) return base
  if (base.toLowerCase().includes(extra.slice(0, 40).toLowerCase())) return base
  return `${base}\n\n${extra}`.slice(0, 3800)
}

/** Ensure stored imagePrompt reflects the beat before blueprint sync overwrites it. */
export function ensureBeatDistinctImagePrompt(scene: GeneratedScene): GeneratedScene {
  const beat = sceneBeatNarration(scene)
  if (!beat) return scene
  const existing = scene.imagePrompt?.trim()
  if (existing && beatAlreadyInBody(beat, existing)) return scene
  const merged = existing
    ? `${beat.slice(0, 200)} — ${existing}`
    : beat.slice(0, 320)
  return {
    ...scene,
    imagePrompt: sanitizeSceneOnlyPrompt(merged),
    visualPrompt: scene.visualPrompt?.trim() || beat.slice(0, 320),
  }
}

export function ensureScenesBeatDistinctPrompts(
  scenes: GeneratedScene[]
): GeneratedScene[] {
  return scenes.map(ensureBeatDistinctImagePrompt)
}

/** Returns scene ids whose prompt fingerprints collide (generation QA). */
export function findDuplicateImagePromptFingerprints(
  promptsBySceneId: Array<{ sceneId: string; prompt: string }>
): string[] {
  const seen = new Map<string, string>()
  const dupes: string[] = []
  for (const { sceneId, prompt } of promptsBySceneId) {
    const fp = imagePromptFingerprint(prompt)
    if (!fp) continue
    const prior = seen.get(fp)
    if (prior) {
      dupes.push(sceneId, prior)
    } else {
      seen.set(fp, sceneId)
    }
  }
  return [...new Set(dupes)]
}

/** Beat tag prefix for scene-only bodies (index is 1-based). */
export function storyboardBeatTag(
  sceneIndex: number,
  totalScenes?: number
): string {
  return `Storyboard beat ${String(sceneIndex).padStart(2, '0')}${totalScenes ? ` of ${totalScenes}` : ''}.`
}

export function mergeBeatLineWithSceneBody(
  beatLine: string,
  body: string,
  ctx?: Pick<SceneImagePromptContext, 'sceneIndex' | 'totalScenes'>
): string {
  const beat = sanitizeSceneOnlyPrompt(beatLine)
  const base = sanitizeSceneOnlyPrompt(body)
  const parts: string[] = []
  if (ctx?.sceneIndex != null) {
    parts.push(storyboardBeatTag(ctx.sceneIndex, ctx.totalScenes))
  }
  if (beat) parts.push(`VO / beat: ${beat.slice(0, 320)}`)
  if (base && !beatAlreadyInBody(beat, base)) parts.push(base)
  else if (base) parts.push(base)
  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 900)
}
