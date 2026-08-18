import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { captionsFromEditStageOutput } from '@/lib/v7/captions.core'

describe('captionsFromEditStageOutput', () => {
  it('reads top-level captions when present', () => {
    const captions = captionsFromEditStageOutput({
      captions: [{ startSec: 0, endSec: 2, text: 'Own the night.' }],
    })
    assert.equal(captions.length, 1)
    assert.equal(captions[0]?.text, 'Own the night.')
  })

  it('falls back to timeline scene captions', () => {
    const captions = captionsFromEditStageOutput({
      timeline: {
        scenes: [
          {
            captions: [
              { startSec: 0, endSec: 10, text: 'Every step writes neon.', speaker: 'Narrator' },
            ],
          },
          { captions: [{ startSec: 10, endSec: 20, text: 'Tap to shop.' }] },
        ],
      },
    })
    assert.equal(captions.length, 2)
    assert.equal(captions[1]?.text, 'Tap to shop.')
    assert.equal(captions[0]?.endSec, 10)
  })

  it('ignores empty caption placeholders', () => {
    const captions = captionsFromEditStageOutput({
      captions: [{ startSec: 0, endSec: 1, text: '   ' }],
      timeline: { scenes: [{ captions: [] }] },
    })
    assert.deepEqual(captions, [])
  })
})
