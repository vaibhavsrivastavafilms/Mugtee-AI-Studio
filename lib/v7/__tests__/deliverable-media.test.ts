import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { v7HasDeliverableMedia } from '@/lib/v7/deliverable-media.core'

describe('v7 deliverable media', () => {
  it('requires a reel url', () => {
    assert.equal(
      v7HasDeliverableMedia({
        reel_url: null,
        status: 'completed',
        export_status: 'completed',
      }),
      false
    )
  })

  it('accepts completed production status with reel url', () => {
    assert.equal(
      v7HasDeliverableMedia({
        reel_url: 'https://example.com/final-reel.mp4',
        status: 'completed',
        export_status: 'pending',
      }),
      true
    )
  })

  it('accepts completed export status even when production status is still producing', () => {
    assert.equal(
      v7HasDeliverableMedia({
        reel_url: 'https://example.com/final-reel.mp4',
        status: 'producing',
        export_status: 'completed',
      }),
      true
    )
  })

  it('rejects reel url before export completes', () => {
    assert.equal(
      v7HasDeliverableMedia({
        reel_url: 'https://example.com/final-reel.mp4',
        status: 'producing',
        export_status: 'rendering',
      }),
      false
    )
  })
})
