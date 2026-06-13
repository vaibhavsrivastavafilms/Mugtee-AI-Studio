import { randomUUID } from 'crypto'

export const SMOKE_PROMPT = 'Execute mode: two-scene Quick Cut end-to-end validation.'
export const SMOKE_HOOK = 'What if your next reel took ninety seconds to plan?'
export const SMOKE_SCRIPT =
  'Scene one sets the hook. Scene two delivers the payoff. This is an execute-mode reel.'

export function makeSmokeScenes() {
  const sceneA = randomUUID()
  const sceneB = randomUUID()
  return [
    {
      id: sceneA,
      title: 'Hook frame',
      description: 'Opening beat for execute Quick Cut.',
      duration: 1,
      visualPrompt: 'Creator at desk, golden hour light, vertical 9:16 cinematic frame',
      imagePrompt:
        '9:16 cinematic still, creator at desk, warm documentary lighting, shallow depth of field',
      cameraAngle: 'medium close-up',
      lightingMood: 'warm documentary',
      environment: 'home studio',
      colorPalette: 'gold and charcoal',
      movementStyle: 'slow push in',
    },
    {
      id: sceneB,
      title: 'Payoff frame',
      description: 'Closing beat for execute Quick Cut.',
      duration: 1,
      visualPrompt: 'Finished reel on phone screen, celebratory mood, vertical 9:16',
      imagePrompt:
        '9:16 cinematic still, phone showing vertical video, soft bokeh, confident creator energy',
      cameraAngle: 'over-the-shoulder',
      lightingMood: 'optimistic',
      environment: 'creative workspace',
      colorPalette: 'amber and black',
      movementStyle: 'gentle drift',
    },
  ]
}

export function toExportScenes(
  scenes: Array<{ id: string; title: string; imageUrl?: string | null; imageAssetPath?: string | null }>
) {
  return scenes.map((scene) => ({
    id: scene.id,
    title: scene.title,
    imageUrl: scene.imageUrl ?? null,
    imageAssetPath: scene.imageAssetPath ?? null,
  }))
}
