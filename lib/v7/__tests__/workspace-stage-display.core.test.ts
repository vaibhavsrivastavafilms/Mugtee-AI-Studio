import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatStageDurationLabel,
  resolveStaleHint,
  WORKSPACE_REVIEW_STAGE_ORDER,
} from '@/lib/v7/workspace/workspace-stage-display.core'

test('formatStageDurationLabel uses completed_at - started_at', () => {
  const label = formatStageDurationLabel({
    id: 's1',
    production_id: 'p1',
    stage: 'script',
    status: 'completed',
    input: null,
    output: null,
    error: null,
    started_at: '2026-08-17T12:00:00.000Z',
    completed_at: '2026-08-17T12:00:12.400Z',
    created_at: '2026-08-17T12:00:00.000Z',
  })
  assert.equal(label, 'Duration: 12.4s')
})

test('resolveStaleHint maps script and final deliverables', () => {
  assert.equal(resolveStaleHint('script'), 'Edited')
  assert.equal(resolveStaleHint('final'), 'Based on previous script')
  assert.equal(resolveStaleHint('voice'), 'Needs update')
})

test('WORKSPACE_REVIEW_STAGE_ORDER includes character, world, and export', () => {
  assert.ok(WORKSPACE_REVIEW_STAGE_ORDER.includes('character'))
  assert.ok(WORKSPACE_REVIEW_STAGE_ORDER.includes('world'))
  assert.ok(WORKSPACE_REVIEW_STAGE_ORDER.includes('export'))
})
