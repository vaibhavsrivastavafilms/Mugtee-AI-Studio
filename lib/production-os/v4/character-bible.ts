/**
 * Character Bible — identity locked across every scene.
 */

import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  buildCharacterReference,
} from '@/lib/production-os/v3/consistency'

export type CharacterBible = {
  id: string
  name: string
  face: string
  hair: string
  outfit: string
  expressions: string[]
  voiceStyle: string
  colourPalette: string[]
  negativePrompt: string
  referenceImages: string[]
  identityLock: string
}

export function buildCharacterBible(input: {
  characterDescription?: string | null
  title?: string | null
  scenes?: GeneratedScene[]
  referenceImageUrls?: string[]
  voiceStyle?: string | null
}): CharacterBible {
  const ref = buildCharacterReference({
    characterDescription: input.characterDescription,
    title: input.title,
    scenes: input.scenes,
    referenceImageUrl: input.referenceImageUrls?.[0] ?? null,
  })

  return {
    id: ref.id,
    name: ref.name,
    face: ref.face,
    hair: ref.hair,
    outfit: ref.clothes,
    expressions: [
      ref.expressionDefault,
      'subtle smile',
      'focused intensity',
      'warm invitation',
    ],
    voiceStyle: input.voiceStyle?.trim() || 'Clear cinematic narration — warm and confident',
    colourPalette: ref.colours,
    negativePrompt: [
      'different face',
      'changed hairstyle',
      'wardrobe swap',
      'age drift',
      'extra limbs',
      'text overlay',
      'watermark',
    ].join(', '),
    referenceImages: (input.referenceImageUrls ?? []).filter(Boolean),
    identityLock: ref.identityLock,
  }
}

export function formatCharacterBibleForPrompt(bible: CharacterBible): string {
  return [
    '[CHARACTER BIBLE — LOCKED]',
    bible.identityLock,
    `Name: ${bible.name}`,
    `Face: ${bible.face}`,
    `Hair: ${bible.hair}`,
    `Outfit: ${bible.outfit}`,
    `Expressions: ${bible.expressions.join('; ')}`,
    `Palette: ${bible.colourPalette.join(', ')}`,
    `Negative: ${bible.negativePrompt}`,
  ].join('\n')
}
