import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  detectProductionCompletionDrift,
  detectProductionStateDrift,
  getNextRunnableStageId,
  getV7StaleRunningMs,
  isV7ExportStageFinalized,
  isV7OrphanPipelineLock,
  isV7PipelineLockActive,
  isLiveGlobalPipelineLock,
  missingDeliverableUrlPatch,
  readV7PipelineLock,
  resolveProductionFieldsAfterStageSuccess,
  shouldPreserveCompletedStageFailure,
  shouldRecoverV7PipelineLock,
  stageRowHasOutput,
  V7_ORPHAN_PIPELINE_LOCK_GRACE_MS,
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
      stageRow('voice', 'queued'),
    ],
    scenes: [],
    timeline: [],
  }
}

describe('pipeline state drift detection', () => {
  it('detects failed production with completed script and queued voice', () => {
    const drift = detectProductionStateDrift(buildDriftSnapshot())
    assert.equal(drift.recoverable, true)
    assert.equal(drift.resumeStage, 'voice')
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
      current_stage: 'voice',
    })
  })

  it('maps script completion to the next runnable stage', () => {
    assert.equal(getNextRunnableStageId('script'), 'voice')
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

    assert.equal(progress.currentStageId, 'voice')
    assert.equal(progress.currentStageLabel, 'Recording voices')
    assert.equal(progress.paused?.failedStageLabel, 'Recording voices')
    assert.equal(progress.eta.frozen, true)
  })
})

describe('normal successful progression fields', () => {
  it('advances current stage to voice after script completes', () => {
    const snapshot = buildDriftSnapshot()
    snapshot.production.status = 'producing'

    const patch = resolveProductionFieldsAfterStageSuccess({
      completedStage: 'script',
      stages: snapshot.stages,
    })

    assert.equal(patch.status, 'producing')
    assert.equal(patch.current_stage, 'voice')
  })
})

function buildExportFinalizedSnapshot(
  overrides: Partial<V7ProductionSnapshot['production']> = {}
): V7ProductionSnapshot {
  const snapshot = buildDriftSnapshot()
  snapshot.production = {
    ...snapshot.production,
    status: 'producing',
    current_stage: 'export',
    reel_url: 'https://cdn.example/reel.mp4',
    export_status: 'completed',
    ...overrides,
  }
  snapshot.stages = [
    ...snapshot.stages.filter((row) => row.stage !== 'export'),
    stageRow('export', 'completed', {
      movUrl: 'https://cdn.example/reel.mov',
      creatorPackUrl: 'https://cdn.example/pack.json',
    }),
  ]
  return snapshot
}

describe('production completion synchronization', () => {
  it('keeps production producing when export is incomplete', () => {
    const snapshot = buildExportFinalizedSnapshot({ export_status: 'pending' })
    assert.equal(isV7ExportStageFinalized(snapshot), false)
    assert.equal(detectProductionCompletionDrift(snapshot), false)

    const patch = resolveProductionFieldsAfterStageSuccess({
      completedStage: 'export',
      stages: snapshot.stages,
      production: snapshot.production,
    })
    assert.equal(patch.status, 'producing')
  })

  it('does not complete when render output exists but export checkpoint is missing', () => {
    const snapshot = buildExportFinalizedSnapshot()
    snapshot.stages = snapshot.stages.map((row) =>
      row.stage === 'export' ? stageRow('export', 'queued') : row
    )
    assert.equal(isV7ExportStageFinalized(snapshot), false)
  })

  it('marks production completed after export checkpoint and reel persist', () => {
    const snapshot = buildExportFinalizedSnapshot()
    assert.equal(isV7ExportStageFinalized(snapshot), true)
    assert.equal(detectProductionCompletionDrift(snapshot), true)

    const patch = resolveProductionFieldsAfterStageSuccess({
      completedStage: 'export',
      stages: snapshot.stages,
      production: snapshot.production,
    })
    assert.deepEqual(patch, { status: 'completed', current_stage: 'export' })
  })

  it('does not complete from reel_url alone before export finishes', () => {
    const snapshot = buildExportFinalizedSnapshot({ export_status: 'rendering' })
    snapshot.stages = snapshot.stages.map((row) =>
      row.stage === 'export' ? stageRow('export', 'running') : row
    )
    assert.equal(isV7ExportStageFinalized(snapshot), false)
  })
})

describe('pipeline lock recovery', () => {
  const now = Date.parse('2026-08-16T01:00:00.000Z')

  it('allows voice stage enough time before stale recovery', () => {
    assert.equal(getV7StaleRunningMs('voice'), 6 * 60 * 1000)
    assert.equal(getV7StaleRunningMs('script'), 150_000)
  })

  it('treats a recent lock as active', () => {
    const lock = {
      locked: true,
      stage: 'music' as const,
      since: new Date(now - 60_000).toISOString(),
      token: 'a',
    }
    assert.equal(isV7PipelineLockActive(lock, now), true)
    assert.equal(shouldRecoverV7PipelineLock({ lock, runningStage: null, now }), false)
  })

  it('treats an unlocked lock as inactive', () => {
    const lock = { locked: false, since: new Date(now).toISOString() }
    assert.equal(isV7PipelineLockActive(lock, now), false)
    assert.equal(shouldRecoverV7PipelineLock({ lock, runningStage: null, now }), false)
  })

  it('blocks concurrent acquisition while another worker holds an active lock', () => {
    const lock = {
      locked: true,
      stage: 'animation' as const,
      since: new Date(now - 30_000).toISOString(),
      token: 'worker-a',
    }
    assert.equal(isV7PipelineLockActive(lock, now), true)
  })

  it('detects stale locks after the stage timeout elapses', () => {
    const lock = {
      locked: true,
      stage: 'render' as const,
      since: new Date(now - 7 * 60 * 1000).toISOString(),
      token: 'stale',
    }
    assert.equal(isV7PipelineLockActive(lock, now), false)
    assert.equal(shouldRecoverV7PipelineLock({ lock, runningStage: null, now }), true)
  })

  it('does not recover an active lock while the matching stage is running', () => {
    const lock = {
      locked: true,
      stage: 'music' as const,
      since: new Date(now - 60_000).toISOString(),
      token: 'live',
    }
    const runningStage = stageRow('music', 'running', null)
    assert.equal(shouldRecoverV7PipelineLock({ lock, runningStage, now }), false)
  })

  it('recovers orphan locks when no running stage matches after grace', () => {
    const lock = {
      locked: true,
      stage: 'music' as const,
      since: new Date(now - V7_ORPHAN_PIPELINE_LOCK_GRACE_MS - 1).toISOString(),
      token: 'orphan',
    }
    assert.equal(isV7OrphanPipelineLock({ lock, runningStage: null, now }), true)
    assert.equal(shouldRecoverV7PipelineLock({ lock, runningStage: null, now }), true)
  })

  it('does not recover orphan locks inside the startup grace window', () => {
    const lock = {
      locked: true,
      stage: 'music' as const,
      since: new Date(now - 30_000).toISOString(),
      token: 'starting',
    }
    assert.equal(isV7OrphanPipelineLock({ lock, runningStage: null, now }), false)
    assert.equal(shouldRecoverV7PipelineLock({ lock, runningStage: null, now }), false)
  })

  it('does not treat stale zombie locks as live global execution slots', () => {
    const lock = {
      locked: true,
      stage: 'voice' as const,
      since: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      token: 'zombie',
    }
    assert.equal(isLiveGlobalPipelineLock({ lock, runningStage: null, now }), false)
  })

  it('does not treat orphan locks past grace as live global execution slots', () => {
    const lock = {
      locked: true,
      stage: 'creative' as const,
      since: new Date(now - V7_ORPHAN_PIPELINE_LOCK_GRACE_MS - 1).toISOString(),
      token: 'orphan',
    }
    assert.equal(isLiveGlobalPipelineLock({ lock, runningStage: null, now }), false)
  })

  it('treats active lock with matching running stage as live global execution slot', () => {
    const lock = {
      locked: true,
      stage: 'animation' as const,
      since: new Date(now - 30_000).toISOString(),
      token: 'live',
    }
    const runningStage = stageRow('animation', 'running', null)
    assert.equal(isLiveGlobalPipelineLock({ lock, runningStage, now }), true)
  })
})

describe('missing deliverable URL repair', () => {
  it('restores voice_url from a completed voice stage when the production row is empty', () => {
    const patch = missingDeliverableUrlPatch({
      production: { voice_url: null, music_url: null },
      stages: [
        stageRow('voice', 'completed', {
          voiceUrl: 'https://cdn.example/voice.mp3',
          audioDurationSec: 12,
        }),
      ],
    })
    assert.deepEqual(patch, { voice_url: 'https://cdn.example/voice.mp3' })
  })

  it('does not overwrite an existing voice_url', () => {
    const patch = missingDeliverableUrlPatch({
      production: { voice_url: 'https://cdn.example/existing.mp3', music_url: null },
      stages: [
        stageRow('voice', 'completed', {
          voiceUrl: 'https://cdn.example/voice.mp3',
        }),
      ],
    })
    assert.deepEqual(patch, {})
  })

  it('does not copy inlined data URLs onto the production row', () => {
    const patch = missingDeliverableUrlPatch({
      production: { voice_url: null, music_url: null },
      stages: [
        stageRow('music', 'completed', {
          musicUrl: 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAAD',
        }),
      ],
    })
    assert.deepEqual(patch, {})
  })
})
