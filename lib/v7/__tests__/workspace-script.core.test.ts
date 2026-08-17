import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  applyScriptSceneEdits,
  buildScriptReviewPayload,
  scriptToDownloadText,
} from '@/lib/v7/workspace/workspace-script.core'

describe('workspace-script.core', () => {
  it('applies scene edits without dropping untouched scenes', () => {
    const script = {
      scenes: [
        {
          number: 1,
          title: 'One',
          duration: 5,
          location: 'Kitchen',
          characters: ['Chef'],
          dialogue: '',
          action: 'Opens door',
          camera: 'Wide',
          lighting: 'Warm',
          movement: 'Slow',
          emotion: 'Calm',
          transition: 'Cut',
          narration: 'The chef arrives',
        },
        {
          number: 2,
          title: 'Two',
          duration: 5,
          location: 'Kitchen',
          characters: ['Chef'],
          dialogue: '',
          action: 'Cooks',
          camera: 'Medium',
          lighting: 'Warm',
          movement: 'Handheld',
          emotion: 'Focused',
          transition: 'Cut',
          narration: 'He cooks',
        },
      ],
    }

    const next = applyScriptSceneEdits(script, [{ number: 1, narration: 'Updated narration' }])
    assert.equal(next.scenes[0]?.narration, 'Updated narration')
    assert.equal(next.scenes[1]?.narration, 'He cooks')
  })

  it('builds downloadable script text', () => {
    const review = buildScriptReviewPayload({
      script: {
        scenes: [
          {
            number: 1,
            title: 'Rain',
            duration: 5,
            location: 'Kitchen',
            characters: ['Chef'],
            dialogue: '',
            action: 'Rain outside',
            camera: 'Wide',
            lighting: 'Warm',
            movement: 'Slow',
            emotion: 'Calm',
            transition: 'Cut',
            narration: 'Monsoon comfort food',
          },
        ],
      },
      sceneRows: [],
      briefTitle: 'Monsoon Food',
      hook: 'Rain and comfort',
    })

    const text = scriptToDownloadText(review)
    assert.match(text, /Monsoon Food/)
    assert.match(text, /Monsoon comfort food/)
  })
})
