import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  detectProductionStateDrift,
  getNextRunnableStageId,
  resolveProductionFieldsAfterStageSuccess,
  shouldPreserveCompletedStageFailure,
  stageRowHasOutput,
} from '@/lib/v7/pipeline-state.core'
import { computeV7ProductionProgress } from '@/lib/v7/production-progress'
import type { V7ProductionSnapshot, V7StageRow } from '@/types/v7/production'

function stageRow(
  stage: V7StageRow['stage'],
  status: V7StageRow['status'],
  output: Record<string, unknown> | null = null
): V7StageRow {
  return {
    id: `${stage}-id`,
    production_id: 'prod-1',
    stage,
    status,
    input: null,
    output,
    error: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
  }
}

function buildDriftSnapshot(): V7ProductionSnapshot {
  return {
    production: {
      id: '88ea4d5d-9249-44a7-a62a-12355a1b4831',
      user_id: 'user-1',
      title: 'Table Tales',
      prompt: 'A monsoon dining story',
      status: 'failed',
      creative_brief: null,
      current_stage: 'script',
      reel_url: null,
      mov_url: null,
      thumbnail_url: null,
      creator_pack_url: null,
      export_status: 'pending',
      timeline_json: null,
      voice_url: null,
      music_url: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    stages: [
      stageRow('research', 'completed', { research: { topics: ['food'] } }),
      stageRow('creative', 'completed', { direction: { visualStyle: 'cinematic' } }),
      stageRow('script', 'completed', { script: { scenes: [{ number: 1, narration: 'Hello' }] } }),
      stageRow('character', 'queued'),
    ],
    scenes: [],
    timeline: [],
  }
}

describe('pipeline state drift detection', () => {
  it('detects failed production with completed script and queued character', () => {
    const drift = detectProductionStateDrift(buildDriftSnapshot())
    assert.equal(drift.recoverable, true)
    assert.equal(drift.resumeStage, 'character')
    assert.equal(drift.lastCompletedStage, 'script')
  })

  it('does not recover when a stage is genuinely failed', () => {
    const snapshot = buildDriftSnapshot()
    snapshot.stages = snapshot.stages.map((row) =>
      row.stage === 'script'
        ? { ...row, status: 'failed', error: 'validation failed', output: null }
        : row
    )

    const drift = detectProductionStateDrift(snapshot)
    assert.equal(drift.recoverable, false)
  })

  it('does not recover when production is already producing', () => {
    const snapshot = buildDriftSnapshot()
    snapshot.production.status = 'producing'
    const drift = detectProductionStateDrift(snapshot)
    assert.equal(drift.recoverable, false)
  })

  it('resolves production fields after successful script completion', () => {
    const snapshot = buildDriftSnapshot()
    snapshot.production.status = 'producing'
    snapshot.production.current_stage = 'script'

    const patch = resolveProductionFieldsAfterStageSuccess({
      completedStage: 'script',
      stages: snapshot.stages,
    })

    assert.deepEqual(patch, {
      status: 'producing',
      current_stage: 'character',
    })
  })

  it('maps script completion to the next runnable stage', () => {
    assert.equal(getNextRunnableStageId('script'), 'character')
  })
})

describe('completed stage failure preservation', () => {
  it('preserves completed stage output from failure clobber', () => {
    const row = stageRow('script', 'completed', { script: { scenes: [] } })
    assert.equal(stageRowHasOutput(row), true)
    assert.equal(shouldPreserveCompletedStageFailure(row), true)
  })

  it('allows genuine failures when the stage is not completed', () => {
    const row = stageRow('script', 'running')
    assert.equal(shouldPreserveCompletedStageFailure(row), false)
  })
})

describe('production progress drift display', () => {
  it('shows the queued next stage while paused without a failed stage row', () => {
    const snapshot = buildDriftSnapshot()
    const progress = computeV7ProductionProgress(snapshot)

    assert.equal(progress.currentStageId, 'character')
    assert.equal(progress.currentStageLabel, 'Designing characters')
    assert.equal(progress.paused?.failedStageLabel, 'Designing characters')
    assert.equal(progress.eta.frozen, true)
  })
})

describe('normal successful progression fields', () => {
  it('advances current stage to character after script completes', () => {
    const snapshot = buildDriftSnapshot()
    snapshot.production.status = 'producing'

    const patch = resolveProductionFieldsAfterStageSuccess({
      completedStage: 'script',
      stages: snapshot.stages,
    })

    assert.equal(patch.status, 'producing')
    assert.equal(patch.current_stage, 'character')
  })
})
