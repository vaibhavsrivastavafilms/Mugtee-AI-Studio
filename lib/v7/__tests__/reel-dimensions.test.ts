import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { resolveReelDimensions } from '@/lib/remotion/reel-dimensions.core'

describe('resolveReelDimensions', () => {
  it('maps 16:9 to 1920x1080', () => {
    const dims = resolveReelDimensions('16:9')
    assert.equal(dims.width, 1920)
    assert.equal(dims.height, 1080)
    assert.equal(dims.fps, 30)
  })

  it('maps 9:16 to 1080x1920', () => {
    const dims = resolveReelDimensions('9:16')
    assert.equal(dims.width, 1080)
    assert.equal(dims.height, 1920)
  })

  it('maps 1:1 to 1080x1080', () => {
    const dims = resolveReelDimensions('1:1')
    assert.equal(dims.width, 1080)
    assert.equal(dims.height, 1080)
  })

  it('defaults unknown ratios to vertical reel dimensions', () => {
    const dims = resolveReelDimensions(undefined)
    assert.equal(dims.width, 1080)
    assert.equal(dims.height, 1920)
  })
})
