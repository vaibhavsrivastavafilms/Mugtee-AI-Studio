import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildContinuationScriptScene,
  mergeScriptDocumentWithInsertion,
  orderSceneRenumberingShifts,
  planSceneInsertion,
} from '@/lib/v7/workspace/workspace-continuation.core'

describe('workspace-continuation.core', () => {
  const sourcePackage = {
    sceneId: 'scene-3',
    sceneNumber: 3,
    durationSec: 10,
    sceneDescription: 'Chef opens refrigerator',
    narration: 'Chef opens refrigerator',
    dialogue: '',
    characterIds: ['chef'],
    environmentId: 'kitchen',
    cameraPlan: 'Medium shot',
    lighting: 'Warm tungsten',
    mood: 'Cozy',
    emotion: 'Calm',
    shotType: 'Medium',
    continuityId: 'prod:scene-3',
    aspectRatio: '9:16',
    motionNotes: '',
    imageUrl: 'https://example.com/scene-3.jpg',
    imageAssetPath: null,
    videoUrl: null,
    imageProvider: null,
    videoProvider: null,
    imageCheckpointAt: null,
    videoCheckpointAt: null,
    captions: [],
    shots: [],
  }

  const sourceScriptScene = {
    number: 3,
    title: 'Three',
    duration: 10,
    location: 'Kitchen',
    characters: ['Chef'],
    action: 'Opens fridge',
    narration: 'Opens fridge',
    dialogue: '',
    camera: 'Medium',
    lighting: 'Warm',
    movement: 'Slow',
    emotion: 'Calm',
    transition: 'Cut',
  }

  it('plans insertion immediately after source scene', () => {
    const plan = planSceneInsertion({
      scenes: [
        { id: 's1', number: 1, script: { number: 1 } },
        { id: 's2', number: 2, script: { number: 2 } },
        { id: 's3', number: 3, script: sourceScriptScene },
        { id: 's4', number: 4, script: { number: 4 } },
      ],
      afterSceneId: 's3',
      continuationIdea: 'Chef removes vegetables while rain continues outside.',
      sourcePackage,
    })

    assert.ok(plan)
    assert.equal(plan!.insertAfterNumber, 3)
    assert.equal(plan!.newSceneNumber, 4)
    assert.equal(plan!.renumbered.length, 1)
    assert.equal(plan!.renumbered[0]?.from, 4)
    assert.equal(plan!.renumbered[0]?.to, 5)
  })

  it('plans mid-sequence insertion for 1,2,3,4,5,7 without number collisions when shifted high-to-low', () => {
    const scenes = [
      { id: 's1', number: 1, script: { number: 1, action: 'one' } },
      { id: 's2', number: 2, script: { number: 2, action: 'two' } },
      { id: 's3', number: 3, script: sourceScriptScene },
      { id: 's4', number: 4, script: { number: 4, action: 'four' } },
      { id: 's5', number: 5, script: { number: 5, action: 'five' } },
      { id: 's7', number: 7, script: { number: 7, action: 'seven' } },
    ]

    const plan = planSceneInsertion({
      scenes,
      afterSceneId: 's3',
      continuationIdea: 'Chef walks deeper into the kitchen.',
      sourcePackage,
    })

    assert.ok(plan)
    assert.equal(plan!.newSceneNumber, 4)
    assert.deepEqual(
      plan!.renumbered.map((row) => ({ sceneId: row.sceneId, from: row.from, to: row.to })),
      [
        { sceneId: 's4', from: 4, to: 5 },
        { sceneId: 's5', from: 5, to: 6 },
        { sceneId: 's7', from: 7, to: 8 },
      ]
    )

    const ordered = orderSceneRenumberingShifts(plan!.renumbered)
    assert.deepEqual(
      ordered.map((row) => row.from),
      [7, 5, 4]
    )

    const numbersById = new Map(scenes.map((scene) => [scene.id, scene.number]))
    for (const shift of ordered) {
      numbersById.set(shift.sceneId, shift.to)
    }
    numbersById.set(plan!.newSceneId, plan!.newSceneNumber)

    const finalNumbers = [...numbersById.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([id, number]) => ({ id, number }))

    assert.deepEqual(finalNumbers, [
      { id: 's1', number: 1 },
      { id: 's2', number: 2 },
      { id: 's3', number: 3 },
      { id: plan!.newSceneId, number: 4 },
      { id: 's4', number: 5 },
      { id: 's5', number: 6 },
      { id: 's7', number: 8 },
    ])

    assert.equal(scenes.find((scene) => scene.id === 's4')?.script.action, 'four')
    assert.equal(scenes.find((scene) => scene.id === 's5')?.script.action, 'five')
    assert.equal(scenes.find((scene) => scene.id === 's7')?.script.action, 'seven')
  })

  it('preserves continuity fields in continuation script scene', () => {
    const sourceScript = {
      number: 3,
      title: 'Three',
      duration: 10,
      location: 'Restaurant kitchen',
      characters: ['Chef'],
      dialogue: '',
      action: 'Opens refrigerator',
      camera: 'Medium shot',
      lighting: 'Warm tungsten',
      movement: 'Slow push',
      emotion: 'Calm',
      transition: 'Cut',
      narration: 'Chef opens refrigerator',
    }

    const nextScene = buildContinuationScriptScene({
      source: sourceScript,
      sourcePackage,
      continuationIdea: 'Chef removes vegetables while rain continues outside.',
      newSceneNumber: 4,
    })

    assert.equal(nextScene.location, 'Restaurant kitchen')
    assert.equal(nextScene.lighting, 'Warm tungsten')
    assert.match(nextScene.action, /vegetables/)
    assert.match(nextScene.narration, /refrigerator/)
  })

  it('merges script document with inserted scene', () => {
    const plan = planSceneInsertion({
      scenes: [{ id: 's3', number: 3, script: sourceScriptScene }],
      afterSceneId: 's3',
      continuationIdea: 'Chef removes vegetables.',
      sourcePackage,
    })!

    const merged = mergeScriptDocumentWithInsertion({
      script: {
        scenes: [
          {
            number: 3,
            title: 'Three',
            duration: 10,
            location: 'Kitchen',
            characters: ['Chef'],
            dialogue: '',
            action: 'Opens fridge',
            camera: 'Medium',
            lighting: 'Warm',
            movement: 'Slow',
            emotion: 'Calm',
            transition: 'Cut',
            narration: 'Opens fridge',
          },
        ],
      },
      plan,
    })

    assert.equal(merged.scenes.length, 2)
    assert.equal(merged.scenes[0]?.number, 3)
    assert.equal(merged.scenes[1]?.number, 4)
  })
})
