import type { GeneratedScene } from '@/lib/cinematic/generation'
import { isRealSceneImageUrl } from '@/lib/quick-cut/asset-availability'

export const THUMBNAIL_COVER_SCENE_ID = 'thumbnail-cover'

const DISPLAY_MAX = 160
const PROMPT_VISUAL_MAX = 100

export function truncateThumbnailText(text: string, max = DISPLAY_MAX): string {
  const t = text.trim()
  if (!t) return ''
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

/** Short visual cue for UI — never the full storyboard imagePrompt. */
export function pickShortSceneVisual(scene?: GeneratedScene | null): string {
  if (!scene) return ''
  const candidates = [
    scene.title,
    scene.description,
    scene.environment,
    scene.lightingMood,
  ]
  for (const raw of candidates) {
    const t = raw?.trim()
    if (!t) continue
    if (t.length <= 120) return t
    return truncateThumbnailText(t, 120)
  }
  return ''
}

export type ThumbnailConceptInput = {
  hook?: string
  title?: string
  scenes?: GeneratedScene[]
  visualStyleLabel?: string | null
}

/** User-facing cover concept (short label). */
export function deriveThumbnailConcept(input: ThumbnailConceptInput): string {
  const hook = input.hook?.trim()
  const title = input.title?.trim()
  const shortVisual =
    pickShortSceneVisual(input.scenes?.[0]) || input.visualStyleLabel?.trim() || ''

  if (hook && shortVisual) {
    return truncateThumbnailText(`"${hook}" — ${shortVisual}`)
  }
  if (title && shortVisual) {
    return truncateThumbnailText(`${title}: ${shortVisual}`)
  }
  if (hook) {
    return truncateThumbnailText(
      `Bold cover frame — "${hook}" in cinematic gold typography`
    )
  }
  if (shortVisual) return truncateThumbnailText(shortVisual)
  return ''
}

export type ThumbnailGenerationPromptInput = ThumbnailConceptInput & {
  visualStyleLabel?: string | null
}

/** Concise provider prompt for dedicated cover image generation. */
export function buildThumbnailGenerationPrompt(
  input: ThumbnailGenerationPromptInput
): string {
  const hook = input.hook?.trim()
  const title = input.title?.trim()
  const scene = input.scenes?.[0]
  const visual = truncateThumbnailText(
    pickShortSceneVisual(scene) || input.visualStyleLabel?.trim() || 'cinematic documentary',
    PROMPT_VISUAL_MAX
  )
  const headline = hook || title || 'Untitled project'
  const mood = scene?.lightingMood?.trim() || scene?.colorPalette?.trim() || ''

  const parts = [
    'Vertical 9:16 social cover still. Single hero frame for video thumbnail.',
    `Subject: ${visual}.`,
    `Story hook: ${truncateThumbnailText(headline, 80)}.`,
  ]
  if (mood) parts.push(`Mood: ${truncateThumbnailText(mood, 60)}.`)
  parts.push(
    'Expressive focal subject, bold cinematic lighting, shallow depth of field.',
    'No text overlays, no watermarks, no collage, no split panels.'
  )
  return parts.join(' ').slice(0, 900)
}

export function buildThumbnailCoverScene(
  input: ThumbnailGenerationPromptInput
): GeneratedScene {
  const first = input.scenes?.[0]
  const imagePrompt = buildThumbnailGenerationPrompt(input)
  return {
    id: THUMBNAIL_COVER_SCENE_ID,
    title: 'Cover thumbnail',
    description: deriveThumbnailConcept(input) || 'Cover frame',
    duration: 1,
    visualPrompt: imagePrompt,
    imagePrompt,
    cameraAngle: first?.cameraAngle?.trim() || 'medium close-up',
    lightingMood: first?.lightingMood?.trim() || 'dramatic cinematic',
    environment: first?.environment?.trim() || 'studio',
    colorPalette: first?.colorPalette?.trim() || 'warm gold and deep shadow',
    movementStyle: 'static hero frame',
  }
}

export function resolveActiveThumbnailUrl(
  thumbnailImageUrl: string | null | undefined,
  scenes: GeneratedScene[]
): string | null {
  if (isRealSceneImageUrl(thumbnailImageUrl)) return thumbnailImageUrl!.trim()
  const first = scenes[0]
  if (isRealSceneImageUrl(first?.imageUrl)) return first!.imageUrl!.trim()
  const alt = scenes.find((s) => isRealSceneImageUrl(s.imageUrl))
  return alt?.imageUrl?.trim() ?? null
}
