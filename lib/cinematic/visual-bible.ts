import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { StoryBible } from '@/lib/cinematic/story-bible'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import {
  buildVisualConsistencyPack,
  type OutputAlignmentControls,
  type SceneBlueprint,
  type VisualConsistencyPack,
} from '@/lib/cinematic/scene-blueprint'
import type { CreativeDirectorBrief, VisualBible } from '@/lib/pipeline/v3-types'

const LENS_BY_STYLE: Record<string, string> = {
  cinematic: '35mm anamorphic — shallow depth, oval bokeh',
  documentary: '24mm handheld — natural perspective',
  luxury: '50mm prime — crisp subject isolation',
  dynamic: '24–70mm zoom — motivated reframes',
  subtle: '40mm — neutral, observational',
}

const CAMERA_MOVEMENT_BY_PACING: Record<string, string> = {
  'slow-burn documentary': 'Measured dolly and gentle pans',
  'rapid-fire montage': 'Whip pans, snap zooms, motivated cuts',
  'breathing room cinematic': 'Slow push-ins with held frames',
  'pulse-drop rhythm': 'Push on beats, hold on drops',
  'tension-release waves': 'Creep-in during tension, release on exhale',
}

function clip(value: string, max: number): string {
  const t = value.trim()
  return t.length > max ? t.slice(0, max) : t
}

export type BuildVisualBibleInput = {
  creativeBrief?: CreativeDirectorBrief | null
  scenes?: GeneratedScene[]
  sceneBlueprints?: SceneBlueprint[]
  storyBible?: StoryBible | null
  visualStyle?: VisualStyle | null
  characterDescription?: string
  controls?: OutputAlignmentControls | null
}

function inferLensType(
  creativeBrief?: CreativeDirectorBrief | null,
  visualStyle?: VisualStyle | null
): string {
  const style = (
    creativeBrief?.visualStyle ||
    visualStyle?.label ||
    'cinematic'
  ).toLowerCase()
  for (const [key, lens] of Object.entries(LENS_BY_STYLE)) {
    if (style.includes(key)) return lens
  }
  return LENS_BY_STYLE.cinematic!
}

function inferCameraMovement(creativeBrief?: CreativeDirectorBrief | null): string {
  const pacing = creativeBrief?.pacingStyle ?? 'breathing room cinematic'
  return (
    CAMERA_MOVEMENT_BY_PACING[pacing] ??
    'Motivated cinematic movement — push, pan, hold'
  )
}

function characterFromSources(
  characterDescription?: string,
  storyBible?: StoryBible | null,
  anchor?: SceneBlueprint | null
): string {
  if (characterDescription?.trim()) return clip(characterDescription, 320)
  const profile = storyBible?.characterProfile
  const parts = [profile?.appearance, profile?.clothing, profile?.name].filter(Boolean)
  if (parts.length) return clip(parts.join(' — '), 320)
  return anchor?.subject?.trim() || 'Consistent protagonist across all scenes'
}

function environmentFromSources(
  storyBible?: StoryBible | null,
  visualStyle?: VisualStyle | null,
  anchor?: SceneBlueprint | null
): string {
  return (
    storyBible?.environment?.trim() ||
    visualStyle?.environment?.trim() ||
    anchor?.location?.trim() ||
    'Cohesive environment thread across scenes'
  )
}

/** Build Visual Bible from existing story bible + scene blueprints + creative brief. */
export function buildVisualBible(input: BuildVisualBibleInput): VisualBible {
  const blueprints = input.sceneBlueprints ?? []
  const anchor = blueprints[0] ?? null
  const consistency: VisualConsistencyPack = blueprints.length
    ? buildVisualConsistencyPack(blueprints, {
        characterDescription: input.characterDescription,
        visualStyle: input.visualStyle,
        storyBible: input.storyBible,
        controls: input.controls,
      })
    : {
        characterReference: 'Consistent protagonist',
        environmentReference: 'Consistent environment',
        visualStyleReference: 'Cinematic vertical storyboard',
      }

  const creative = input.creativeBrief
  const storyBible = input.storyBible
  const visualStyle = input.visualStyle

  return {
    artStyle:
      creative?.visualStyle ||
      storyBible?.visualStyle?.trim() ||
      visualStyle?.label?.trim() ||
      'Cinematic photoreal — vertical 9:16',
    colorPalette:
      anchor?.colorPalette?.trim() ||
      storyBible?.colorPalette?.trim() ||
      visualStyle?.palette?.trim() ||
      'Cohesive warm-cool contrast palette',
    lensType: inferLensType(creative, visualStyle),
    lighting:
      anchor?.lighting?.trim() ||
      visualStyle?.lighting?.trim() ||
      storyBible?.mood?.trim() ||
      'Motivated cinematic key with practical fill',
    cameraMovement: inferCameraMovement(creative),
    character: characterFromSources(input.characterDescription, storyBible, anchor),
    environment: environmentFromSources(storyBible, visualStyle, anchor),
    mood:
      creative?.emotionalTone ||
      anchor?.emotion ||
      storyBible?.mood?.trim() ||
      'Cinematic emotional arc',
    consistencyPack: consistency,
  }
}

/** Merge visual bible constraints into scene blueprints for downstream image/video. */
export function mergeVisualBibleIntoBlueprints(
  blueprints: SceneBlueprint[],
  bible: VisualBible
): SceneBlueprint[] {
  return blueprints.map((bp) => ({
    ...bp,
    colorPalette: bp.colorPalette || bible.colorPalette,
    lighting: bp.lighting || bible.lighting,
    movementStyle: bp.movementStyle || bible.cameraMovement,
    subject: bp.subject || bible.character,
    location: bp.location || bible.environment,
  }))
}

/** Format visual bible for image generation prompts. */
export function formatVisualBibleForPrompt(bible: VisualBible): string {
  return [
    'VISUAL BIBLE (global consistency):',
    `Art style: ${bible.artStyle}`,
    `Palette: ${bible.colorPalette}`,
    `Lens: ${bible.lensType}`,
    `Lighting: ${bible.lighting}`,
    `Camera movement: ${bible.cameraMovement}`,
    `Character: ${bible.character}`,
    `Environment: ${bible.environment}`,
    `Mood: ${bible.mood}`,
    bible.consistencyPack.characterReference,
    bible.consistencyPack.environmentReference,
    bible.consistencyPack.visualStyleReference,
  ].join('\n')
}

export function parseVisualBible(raw: unknown): VisualBible | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const pack =
    o.consistencyPack && typeof o.consistencyPack === 'object'
      ? (o.consistencyPack as Record<string, unknown>)
      : {}
  const artStyle = String(o.artStyle ?? '').trim()
  if (!artStyle) return null
  return {
    artStyle,
    colorPalette: String(o.colorPalette ?? '').trim() || 'Cohesive palette',
    lensType: String(o.lensType ?? '').trim() || LENS_BY_STYLE.cinematic!,
    lighting: String(o.lighting ?? '').trim() || 'Cinematic lighting',
    cameraMovement: String(o.cameraMovement ?? '').trim() || 'Motivated movement',
    character: String(o.character ?? '').trim() || 'Protagonist',
    environment: String(o.environment ?? '').trim() || 'Setting',
    mood: String(o.mood ?? '').trim() || 'Cinematic',
    consistencyPack: {
      characterReference: String(pack.characterReference ?? '').trim() || 'Character lock',
      environmentReference: String(pack.environmentReference ?? '').trim() || 'Environment lock',
      visualStyleReference: String(pack.visualStyleReference ?? '').trim() || 'Style lock',
    },
  }
}
