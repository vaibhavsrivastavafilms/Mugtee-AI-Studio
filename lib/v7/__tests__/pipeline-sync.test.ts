import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { isAutoRequeueableStageStatus, isOrphanQueuedStageRow } from '@/lib/v7/pipeline-state.core'
import type { V7StageRow } from '@/types/v7/production'

function stageRow(
  stage: V7StageRow['stage'],
  status: V7StageRow['status'],
  overrides: Partial<V7StageRow> = {}
): V7StageRow {
  return {
    id: `${stage}-id`,
    production_id: 'prod-1',
    stage,
    status,
    input: null,
    output: null,
    error: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('orphan queued stage detection', () => {
  it('case A: normal queued row without completed_at is not orphan', () => {
    assert.equal(isOrphanQueuedStageRow(stageRow('script', 'queued')), false)
  })

  it('case B: queued row with completed_at and no output is orphan', () => {
    const row = stageRow('script', 'queued', {
      completed_at: '2026-08-14T20:56:03.063+00:00',
      started_at: '2026-08-14T20:55:50.073+00:00',
    })
    assert.equal(isOrphanQueuedStageRow(row), true)
  })

  it('case C: completed row with output is not orphan', () => {
    const row = stageRow('script', 'completed', {
      completed_at: '2026-08-14T21:32:34.828+00:00',
      output: { script: { scenes: [{ number: 1, narration: 'Hello' }] } },
    })
    assert.equal(isOrphanQueuedStageRow(row), false)
  })

  it('case D: failed row is not orphan', () => {
    const row = stageRow('script', 'failed', {
      completed_at: '2026-08-14T20:56:03.063+00:00',
      error: 'PROVIDER_UNAVAILABLE',
    })
    assert.equal(isOrphanQueuedStageRow(row), false)
  })

  it('failed status is never auto-requeueable (prevents render retry loops)', () => {
    assert.equal(isAutoRequeueableStageStatus('failed'), false)
  })

  it('handles undefined safely', () => {
    assert.equal(isOrphanQueuedStageRow(undefined), false)
  })
})
