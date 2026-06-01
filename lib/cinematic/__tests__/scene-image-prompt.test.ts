import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSceneImagePrompt,
  type GeneratedScene,
} from '@/lib/cinematic/generation'
import {
  findDuplicateImagePromptFingerprints,
  formatTimelineSecRange,
  imagePromptFingerprint,
  roundTimelineSec,
} from '@/lib/cinematic/scene-image-prompt'

function beatScene(index: number, narration: string): GeneratedScene {
  return {
    id: `scene-${index}`,
    title: index === 1 ? 'HOOK' : `BEAT ${index - 1}`,
    description: narration,
    duration: 4,
    visualPrompt: narration,
    imagePrompt: narration.slice(0, 200),
    cameraAngle: 'Medium close-up',
    lightingMood: 'Soft key',
    environment: index === 1 ? 'Interior room with lamp' : `Location ${index}`,
    colorPalette: 'Warm neutrals',
    movementStyle: 'Slow push-in',
  }
}

describe('scene image prompts per beat', () => {
  it('builds 8 distinct prompt fingerprints for 8 script beats', () => {
    const narrations = [
      'In a single day, I discovered the truth about resilience',
      'It started like any other day…',
      'Then everything changed when the call came',
      'I had to face what I was avoiding',
      'The lesson was not what I expected',
      'Small habits compounded into something bigger',
      'I almost quit right before the breakthrough',
      'Now I carry that resilience into every morning',
    ]
    const scenes = narrations.map((n, i) => beatScene(i + 1, n))
    const prompts = scenes.map((scene, i) => ({
      sceneId: scene.id,
      prompt: buildSceneImagePrompt(scene, {
        sceneIndex: i + 1,
        totalScenes: scenes.length,
        characterDescription: 'A reflective creator in their thirties',
      }),
    }))
    const dupes = findDuplicateImagePromptFingerprints(prompts)
    assert.equal(dupes.length, 0, `duplicate prompts: ${dupes.join(', ')}`)
    const fps = new Set(prompts.map((p) => imagePromptFingerprint(p.prompt)))
    assert.equal(fps.size, 8)
  })

  it('rounds timeline seconds for display', () => {
    assert.equal(roundTimelineSec(28.270000000000003), 28.27)
    assert.equal(formatTimelineSecRange(0, 28.270000000000003), '0s–28.27s')
  })
})
