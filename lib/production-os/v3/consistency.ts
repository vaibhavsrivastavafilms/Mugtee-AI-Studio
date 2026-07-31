/**
 * Character + Environment consistency — one reference reused across every scene.
 */

import type { GeneratedScene } from '@/lib/cinematic/generation'
import type {
  CharacterReference,
  EnvironmentProfile,
} from '@/lib/production-os/v3/types'

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (v?.trim()) return v.trim()
  }
  return ''
}

/** Build a locked character reference from story / scenes. */
export function buildCharacterReference(input: {
  characterDescription?: string | null
  title?: string | null
  scenes?: GeneratedScene[]
  referenceImageUrl?: string | null
}): CharacterReference {
  const fromScenes = input.scenes
    ?.map((s) => s.description || s.title || '')
    .find((s) => s.trim())
  const identity = firstNonEmpty(
    input.characterDescription,
    fromScenes,
    'Primary subject — consistent face, hair, wardrobe across every scene'
  )

  return {
    id: 'char-primary',
    name: firstNonEmpty(input.title, 'Lead Character'),
    face: `Same facial structure and identity: ${identity.slice(0, 180)}`,
    hair: 'Identical hairstyle, colour, and length in every frame',
    clothes: 'Same wardrobe silhouette and colours unless scripted change',
    expressionDefault: 'Natural performance matching scene emotion',
    lighting: 'Match key light direction and colour temperature to environment profile',
    colours: ['skin-consistent', 'wardrobe-locked', 'no-palette-drift'],
    identityLock: [
      'CHARACTER LOCK — do not change identity between scenes.',
      identity,
      'Same face, hair, clothes, proportions. No character drift.',
    ].join(' '),
    referenceImageUrl: input.referenceImageUrl ?? null,
  }
}

/** Build a locked environment profile from scenes / style. */
export function buildEnvironmentProfile(input: {
  environmentHint?: string | null
  style?: string | null
  scenes?: GeneratedScene[]
  referenceImageUrl?: string | null
}): EnvironmentProfile {
  const fromScenes = input.scenes?.map((s) => s.environment || '').find((s) => s.trim())
  const env = firstNonEmpty(
    input.environmentHint,
    fromScenes,
    input.style,
    'Cinematic shared world — consistent architecture and atmosphere'
  )

  return {
    id: 'env-primary',
    name: 'Primary World',
    lighting: 'Consistent key/fill ratio and colour temperature across scenes',
    weather: 'Stable weather unless scene explicitly changes it',
    architecture: env.slice(0, 200),
    objects: ['recurring props', 'world landmarks', 'grounded set dressing'],
    colourPalette: ['locked grade', 'shared contrast', 'no random palette shifts'],
    mood: firstNonEmpty(input.style, 'cinematic_emotional'),
    referenceImageUrl: input.referenceImageUrl ?? null,
  }
}

/** Prompt block injected into every scene image generation. */
export function formatConsistencyPromptBlock(
  character: CharacterReference | null,
  environment: EnvironmentProfile | null
): string {
  const parts: string[] = []
  if (character) {
    parts.push(
      `[CHARACTER REFERENCE]\n${character.identityLock}\nFace: ${character.face}\nHair: ${character.hair}\nClothes: ${character.clothes}`
    )
  }
  if (environment) {
    parts.push(
      `[ENVIRONMENT PROFILE]\n${environment.architecture}\nLighting: ${environment.lighting}\nWeather: ${environment.weather}\nMood: ${environment.mood}\nPalette: ${environment.colourPalette.join(', ')}`
    )
  }
  return parts.join('\n\n')
}
