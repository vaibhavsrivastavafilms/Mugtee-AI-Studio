/**
 * Environment Bible — world locked across every scene.
 */

import type { GeneratedScene } from '@/lib/cinematic/generation'
import { buildEnvironmentProfile } from '@/lib/production-os/v3/consistency'

export type EnvironmentBible = {
  id: string
  name: string
  lighting: string
  architecture: string
  weather: string
  props: string[]
  mood: string
  objects: string[]
  textures: string[]
  colourPalette: string[]
  referenceImages: string[]
  worldLock: string
}

export function buildEnvironmentBible(input: {
  environmentHint?: string | null
  style?: string | null
  scenes?: GeneratedScene[]
  referenceImageUrls?: string[]
}): EnvironmentBible {
  const profile = buildEnvironmentProfile({
    environmentHint: input.environmentHint,
    style: input.style,
    scenes: input.scenes,
    referenceImageUrl: input.referenceImageUrls?.[0] ?? null,
  })

  return {
    id: profile.id,
    name: profile.name,
    lighting: profile.lighting,
    architecture: profile.architecture,
    weather: profile.weather,
    props: ['signature prop set', 'grounded set dressing'],
    mood: profile.mood,
    objects: profile.objects,
    textures: ['consistent materials', 'shared surface detail', 'no random location jumps'],
    colourPalette: profile.colourPalette,
    referenceImages: (input.referenceImageUrls ?? []).filter(Boolean),
    worldLock: [
      'ENVIRONMENT LOCK — same world across every scene.',
      profile.architecture,
      `Lighting: ${profile.lighting}`,
      `Weather: ${profile.weather}`,
      `Mood: ${profile.mood}`,
    ].join(' '),
  }
}

export function formatEnvironmentBibleForPrompt(bible: EnvironmentBible): string {
  return [
    '[ENVIRONMENT BIBLE — LOCKED]',
    bible.worldLock,
    `Architecture: ${bible.architecture}`,
    `Lighting: ${bible.lighting}`,
    `Weather: ${bible.weather}`,
    `Mood: ${bible.mood}`,
    `Props: ${bible.props.join(', ')}`,
    `Textures: ${bible.textures.join(', ')}`,
    `Palette: ${bible.colourPalette.join(', ')}`,
  ].join('\n')
}
