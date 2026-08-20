import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { reelSceneTransformExtras } from '@/lib/remotion/reel-transitions'

describe('Remotion Chrome OOM guards', () => {
  it('never requests CSS blur pixels for blur_fade (screenshotTask memory)', () => {
    const extras = reelSceneTransformExtras(0, 300, 'blur_fade', 3)
    assert.equal(extras.blurPx, 0)
  })

  it('still animates light_leak opacity without blur', () => {
    const start = reelSceneTransformExtras(0, 300, 'light_leak', 2)
    const mid = reelSceneTransformExtras(20, 300, 'light_leak', 2)
    assert.ok(start.leakOpacity > mid.leakOpacity)
    assert.equal(start.blurPx, 0)
  })
})
