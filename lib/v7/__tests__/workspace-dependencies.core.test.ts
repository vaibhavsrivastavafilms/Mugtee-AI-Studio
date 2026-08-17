import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildStaleMarkers,
  downstreamStagesForEdit,
  firstRegenerationStage,
  userFacingAffectedStageLabels,
} from '@/lib/v7/workspace/workspace-dependencies.core'

describe('workspace-dependencies.core', () => {
  it('maps script edits to voice-first downstream stages', () => {
    const stages = downstreamStagesForEdit('script')
    assert.equal(stages[0], 'voice')
    assert.ok(stages.includes('render'))
    assert.equal(firstRegenerationStage('script'), 'voice')
  })

  it('maps voice edits to timing-dependent downstream stages', () => {
    const stages = downstreamStagesForEdit('voice')
    assert.ok(stages.includes('edit'))
    assert.ok(!stages.includes('image'))
  })

  it('builds scene-scoped stale labels', () => {
    const markers = buildStaleMarkers({
      source: 'scene',
      reason: 'Scene edited',
      staleAt: '2026-08-17T00:00:00.000Z',
      sceneNumber: 3,
    })
    const labels = userFacingAffectedStageLabels(markers)
    assert.ok(labels.some((label) => label.includes('Scene 3')))
  })
})
