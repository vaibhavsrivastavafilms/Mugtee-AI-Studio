/**
 * AGENT 7 — Prompt Engine
 * Storyboard frames → cinematic AI prompts (Pixar-inspired stylised 3D).
 * Batches of 10 when scene count > 10 (invisible to creator).
 */

import type { EnvironmentBible } from '@/lib/production-os/v4/environment-bible'
import type {
  CharacterBibleEntry,
  ProductionPromptBatch,
  StoryboardPanel,
} from '@/lib/mugtee-agents/types'

const BATCH_SIZE = 10
const STYLE =
  'Pixar-inspired stylised 3D animation, cinematic lighting, family-friendly, child-safe'

function speakingListening(dialogue: string, characters: string[]): {
  speaking: string
  listening: string
} {
  const speaking = characters[0] ?? 'Lead'
  const listening = characters[1] ?? characters[0] ?? 'Listener'
  if (dialogue.includes(':')) {
    const name = dialogue.split(':')[0]?.trim()
    if (name) {
      return {
        speaking: name,
        listening: characters.find((c) => c !== name) ?? listening,
      }
    }
  }
  return { speaking, listening }
}

function buildPrompt(
  panel: StoryboardPanel,
  characters: CharacterBibleEntry[],
  environment: EnvironmentBible
): ProductionPromptBatch['prompts'][number] {
  const lead = characters[0]
  const { speaking, listening } = speakingListening(
    panel.dialogue,
    panel.characters
  )

  const prompt = [
    `${STYLE}, ultra detailed film still.`,
    `Scene ${panel.sceneNumber}. Emotion: ${panel.emotion}.`,
    lead
      ? `CHARACTER LOCK: ${lead.identityLock}. Face: ${lead.face}. Hair: ${lead.hair}. Outfit: ${lead.outfit}. Body: ${lead.bodyShape}. Reference: ${lead.referencePrompt.slice(0, 180)}.`
      : `Characters: ${panel.characters.join(', ')}.`,
    `ENVIRONMENT LOCK: ${environment.worldLock}. Architecture: ${environment.architecture}. Props consistent. Weather: ${environment.weather}. Time of day locked to scene.`,
    `Lighting: ${panel.lighting}. Palette: ${environment.colourPalette.join(', ')}.`,
    `Camera: ${panel.camera}. Lens ${panel.lens}. Composition: ${panel.composition}. Movement: ${panel.movement}.`,
    `Character placement: ${panel.characterPlacement}.`,
    `Body language and facial expression: ${panel.emotion}. Eye movement subtle and alive.`,
    `Speaking character: ${speaking}. Listening character: ${listening}.`,
    `Exact dialogue: ${panel.dialogue}`,
    'No text overlays, no watermark, no logo, never photoreal horror.',
  ].join(' ')

  return {
    sceneNumber: panel.sceneNumber,
    prompt,
    negativePrompt: [
      lead?.negativePrompt,
      'inconsistent face',
      'wardrobe change',
      'age drift',
      'horror',
      'gore',
      'nsfw',
      'photoreal pores',
      'text',
      'watermark',
      'slideshow',
      'static image only',
    ]
      .filter(Boolean)
      .join(', '),
    speakingCharacter: speaking,
    listeningCharacter: listening,
    dialogue: panel.dialogue,
    lipSyncGuidance: `Lip sync exact dialogue for ${speaking}; ${listening} listens with micro-reactions; eye blinks and brow motion.`,
    animationInstructions: [
      panel.movement,
      'character animation',
      'facial animation + lip sync',
      'eye movement',
      'foreground and background parallax',
      'depth layers',
      'atmospheric particles',
      'lighting animation',
      `weather animation: ${environment.weather}`,
      'professional cinematic motion — NEVER slideshow',
      STYLE,
    ].join('; '),
    animationStyle: 'pixar_stylised_3d',
  }
}

/** AGENT 7 */
export function runPromptEngine(
  storyboard: StoryboardPanel[],
  characters: CharacterBibleEntry[],
  environment: EnvironmentBible
): ProductionPromptBatch[] {
  const prompts = storyboard.map((panel) =>
    buildPrompt(panel, characters, environment)
  )

  if (prompts.length <= BATCH_SIZE) {
    return [
      {
        batchIndex: 0,
        sceneNumbers: prompts.map((p) => p.sceneNumber),
        prompts,
      },
    ]
  }

  const batches: ProductionPromptBatch[] = []
  for (let i = 0; i < prompts.length; i += BATCH_SIZE) {
    const slice = prompts.slice(i, i + BATCH_SIZE)
    batches.push({
      batchIndex: batches.length,
      sceneNumbers: slice.map((p) => p.sceneNumber),
      prompts: slice,
    })
  }
  return batches
}

export function flattenPromptBatches(
  batches: ProductionPromptBatch[]
): ProductionPromptBatch['prompts'] {
  return batches.flatMap((b) => b.prompts)
}
