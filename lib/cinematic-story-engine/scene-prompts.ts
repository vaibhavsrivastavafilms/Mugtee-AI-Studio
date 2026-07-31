import type { CharacterBible } from '@/lib/production-os/v4/character-bible'
import type { EnvironmentBible } from '@/lib/production-os/v4/environment-bible'
import type {
  SceneProductionPrompt,
  ScreenplayScene,
  StoryUnderstanding,
} from '@/lib/cinematic-story-engine/types'

const LENSES = ['24mm', '35mm', '50mm', '85mm'] as const
const COMPOSITIONS = [
  'rule of thirds',
  'centered heroic',
  'leading lines',
  'frame within frame',
] as const

/** STEP 6 — Convert screenplay scenes into production prompts (hidden from creator). */
export function generateSceneProductionPrompts(input: {
  understanding: StoryUnderstanding
  screenplay: ScreenplayScene[]
  characterBible: CharacterBible
  environmentBible: EnvironmentBible
  style?: string
}): SceneProductionPrompt[] {
  const style = input.style?.trim() || 'cinematic photoreal, film still, shallow depth of field'
  const { characterBible: char, environmentBible: env } = input

  return input.screenplay.map((scene, i) => {
    const lens = LENSES[i % LENSES.length]!
    const composition = COMPOSITIONS[i % COMPOSITIONS.length]!
    const prompt = [
      `Cinematic film still, ${input.understanding.genre}.`,
      `Scene ${scene.sceneNumber}: ${scene.narration}`,
      `Location: ${scene.location}.`,
      `Characters (LOCKED): ${char.identityLock}`,
      `Appearance: ${char.face}; ${char.hair}; outfit ${char.outfit}.`,
      `Environment (LOCKED): ${env.worldLock}`,
      `Lighting: ${scene.lighting}. Architecture mood: ${env.mood}.`,
      `Camera: ${scene.cameraDirection}. Lens ${lens}. Composition: ${composition}.`,
      `Emotion: ${scene.emotion}. Colour grade: ${env.colourPalette.join(', ')}.`,
      `Style: ${style}. Ultra detailed, no text, no watermark.`,
    ].join(' ')

    return {
      sceneNumber: scene.sceneNumber,
      prompt,
      negativePrompt: [
        char.negativePrompt,
        'inconsistent face',
        'wardrobe change',
        'different location style',
        'blurry',
        'deformed hands',
        'extra fingers',
        'text',
        'logo',
        'watermark',
      ].join(', '),
      animationInstructions: [
        scene.cameraDirection,
        'subtle character motion',
        'parallax depth',
        'atmospheric particles',
        'living light flicker',
        env.weather !== 'Stable weather unless scene explicitly changes it'
          ? `weather: ${env.weather}`
          : 'gentle environmental life',
      ].join('; '),
      camera: scene.cameraDirection,
      lens,
      composition,
      lighting: scene.lighting,
      movement: scene.cameraDirection,
      emotion: scene.emotion,
      style,
    }
  })
}
