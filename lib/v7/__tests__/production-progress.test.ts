import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildStageProgressList,
  computeProductionElapsedMs,
  computeV7ProductionProgress,
  formatDurationMs,
  formatRemainingLabel,
  resolveV7SceneProgress,
  smoothEtaRemainingMs,
  V7_STAGE_WEIGHTS,
} from '@/lib/v7/production-progress'
import {
  V7_STAGE_LABELS,
  type V7ProductionSnapshot,
  type V7StageId,
  type V7StageRow,
  type V7TimelineStage,
} from '@/types/v7/production'
import { V7_ALL_STAGES } from '@/lib/v7/pipeline'

function stageRow(
  stage: V7StageRow['stage'],
  status: V7StageRow['status'],
  overrides: Partial<V7StageRow> = {}
): V7StageRow {
  return {
    id: `${stage}-id`,
    production_id: 'prod-test',
    stage,
    status,
    input: null,
    output: null,
    error: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-08-16T22:00:00.000Z',
    ...overrides,
  }
}

function buildTimeline(stages: V7StageRow[]): V7TimelineStage[] {
  const byStage = new Map(stages.map((row) => [row.stage, row]))
  return V7_ALL_STAGES.map((id) => {
    const row = byStage.get(id)
    const meta = V7_STAGE_LABELS[id]
    let status: V7TimelineStage['status'] = 'pending'
    if (row?.status === 'running') status = 'running'
    else if (row?.status === 'completed') status = 'completed'
    else if (row?.status === 'failed') status = 'failed'
    return { id, label: meta.label, emoji: meta.emoji, status, error: row?.error ?? null }
  })
}

function baseProduction(
  overrides: Partial<V7ProductionSnapshot['production']> = {}
): V7ProductionSnapshot['production'] {
  return {
    id: 'prod-test',
    user_id: 'user-1',
    title: 'Test reel',
    prompt: 'Test prompt',
    status: 'producing',
    creative_brief: {
      title: 'Test reel',
      duration: 30,
      platform: 'Instagram',
      language: 'en',
      aspectRatio: '9:16',
      genre: 'Food',
      style: 'cinematic',
      sceneCount: 6,
      voiceDirection: 'calm',
      musicDirection: 'ambient',
      emotion: 'cozy',
      audience: 'everyone',
      characterConsistency: true,
    },
    current_stage: 'voice',
    reel_url: null,
    mov_url: null,
    thumbnail_url: null,
    creator_pack_url: null,
    export_status: 'pending',
    timeline_json: null,
    voice_url: null,
    music_url: null,
    created_at: '2026-08-16T22:00:00.000Z',
    updated_at: '2026-08-16T22:10:00.000Z',
    ...overrides,
  }
}

function buildSnapshot(params: {
  stages: V7StageRow[]
  scenes?: V7ProductionSnapshot['scenes']
  production?: Partial<V7ProductionSnapshot['production']>
}): V7ProductionSnapshot {
  const stages = params.stages
  return {
    production: baseProduction(params.production),
    stages,
    scenes: params.scenes ?? [],
    timeline: buildTimeline(stages),
  }
}

describe('V7 production progress — per-stage display', () => {
  it('completed stage shows 100%', () => {
    const snapshot = buildSnapshot({
      stages: [
        stageRow('idea', 'completed', {
          started_at: '2026-08-16T22:00:00.000Z',
          completed_at: '2026-08-16T22:00:08.000Z',
          output: { durationMs: 8000 },
        }),
        stageRow('research', 'queued'),
      ],
    })

    const list = buildStageProgressList(snapshot, new Date('2026-08-16T22:05:00.000Z'))
    const idea = list.find((stage) => stage.stageId === 'idea')
    assert.equal(idea?.percent, 100)
    assert.equal(idea?.indeterminate, false)
    assert.match(idea?.timingLabel ?? '', /Completed in 8s/)
  })

  it('running scene stage uses real checkpoint progress', () => {
    const snapshot = buildSnapshot({
      production: { current_stage: 'image' },
      stages: [
        stageRow('idea', 'completed'),
        stageRow('image', 'running', {
          started_at: '2026-08-16T22:05:00.000Z',
        }),
      ],
      scenes: Array.from({ length: 6 }, (_, i) => ({
        id: `scene-${i + 1}`,
        production_id: 'prod-test',
        number: i + 1,
        script: {},
        storyboard:
          i < 3
            ? { imageCheckpointAt: '2026-08-16T22:06:00.000Z', imageUrl: `https://cdn/${i + 1}.png` }
            : {},
        duration: 5,
        created_at: '2026-08-16T22:05:00.000Z',
      })),
    })

    const imageStage = buildStageProgressList(snapshot).find((stage) => stage.stageId === 'image')
    assert.equal(imageStage?.percent, 50)
    assert.equal(imageStage?.detailLabel, '3 / 6 scenes')
    assert.equal(imageStage?.indeterminate, false)
  })

  it('queued stage shows 0%', () => {
    const snapshot = buildSnapshot({
      stages: [stageRow('idea', 'completed'), stageRow('research', 'queued')],
    })
    const research = buildStageProgressList(snapshot).find((stage) => stage.stageId === 'research')
    assert.equal(research?.percent, 0)
    assert.equal(research?.timingLabel, 'Waiting')
  })

  it('failed stage shows failed without numeric progress', () => {
    const snapshot = buildSnapshot({
      production: { status: 'failed', current_stage: 'script' },
      stages: [
        stageRow('script', 'failed', { error: 'Screenplay validation failed' }),
      ],
    })

    const script = buildStageProgressList(snapshot).find((stage) => stage.stageId === 'script')
    assert.equal(script?.status, 'failed')
    assert.equal(script?.percent, null)
    assert.equal(script?.timingLabel, 'Failed')
    assert.equal(script?.error, 'Screenplay validation failed')
  })

  it('resolveV7SceneProgress counts image checkpoints', () => {
    const snapshot = buildSnapshot({
      stages: [stageRow('image', 'running')],
      scenes: [
        {
          id: 'scene-1',
          production_id: 'prod-test',
          number: 1,
          script: {},
          storyboard: { imageCheckpointAt: '2026-08-16T22:06:00.000Z' },
          duration: 5,
          created_at: '2026-08-16T22:05:00.000Z',
        },
        {
          id: 'scene-2',
          production_id: 'prod-test',
          number: 2,
          script: {},
          storyboard: {},
          duration: 5,
          created_at: '2026-08-16T22:05:00.000Z',
        },
      ],
    })

    const scene = resolveV7SceneProgress(snapshot, 'image')
    assert.equal(scene?.completedScenes, 1)
    assert.equal(scene?.totalScenes, 2)
    assert.equal(scene?.scenePercent, 50)
  })

  it('running non-scene stage is indeterminate without fake percent', () => {
    const snapshot = buildSnapshot({
      production: { current_stage: 'creative' },
      stages: [
        stageRow('creative', 'running', {
          started_at: '2026-08-16T22:01:00.000Z',
        }),
      ],
    })

    const creative = buildStageProgressList(snapshot, new Date('2026-08-16T22:01:18.000Z')).find(
      (stage) => stage.stageId === 'creative'
    )
    assert.equal(creative?.percent, null)
    assert.equal(creative?.indeterminate, true)
    assert.equal(creative?.detailLabel, 'Processing…')
    assert.match(creative?.timingLabel ?? '', /elapsed/)
  })
})

describe('V7 production progress — overall and ETA', () => {
  it('uses weighted progress rather than stage count', () => {
    const snapshot = buildSnapshot({
      stages: V7_ALL_STAGES.map((id) =>
        stageRow(id, id === 'idea' || id === 'research' ? 'completed' : 'queued')
      ),
    })

    const progress = computeV7ProductionProgress(snapshot)
    const naivePercent = Math.round((2 / V7_ALL_STAGES.length) * 100)
    assert.notEqual(progress.overallPercent, naivePercent)
    assert.ok(progress.overallPercent > 0)
    assert.ok(progress.overallPercent < 100)

    const expected =
      (V7_STAGE_WEIGHTS.idea + V7_STAGE_WEIGHTS.research) / 100 * 100
    assert.equal(progress.overallPercent, Math.round(expected))
  })

  it('includes historical average when provided', () => {
    const snapshot = buildSnapshot({ stages: [stageRow('idea', 'running')] })
    const progress = computeV7ProductionProgress(snapshot, new Date(), {
      historicalAverageMs: 272_000,
    })
    assert.equal(progress.historicalAverageMs, 272_000)
  })

  it('computes ETA from completed stage durations', () => {
    const completedStages: Partial<Record<V7StageId, number>> = {
      idea: 8_000,
      research: 14_000,
      creative: 11_000,
      script: 21_000,
    }

    const snapshot = buildSnapshot({
      production: { current_stage: 'voice' },
      stages: V7_ALL_STAGES.map((id) => {
        const durationMs = completedStages[id]
        if (durationMs == null) {
          return stageRow(id, id === 'voice' ? 'running' : 'queued', {
            started_at: id === 'voice' ? '2026-08-16T22:01:00.000Z' : null,
          })
        }
        return stageRow(id, 'completed', {
          output: { durationMs },
          started_at: '2026-08-16T22:00:00.000Z',
          completed_at: '2026-08-16T22:01:00.000Z',
        })
      }),
    })

    const now = new Date('2026-08-16T22:02:00.000Z')
    const progress = computeV7ProductionProgress(snapshot, now)
    assert.ok(progress.eta.remainingMs != null)
    assert.ok(progress.eta.remainingMs > 0)
    assert.match(progress.eta.label ?? '', /^~/)
  })

  it('shows Estimating when insufficient timing data', () => {
    const snapshot = buildSnapshot({
      stages: [stageRow('idea', 'running', { started_at: '2026-08-16T22:00:00.000Z' })],
    })
    const progress = computeV7ProductionProgress(snapshot, new Date('2026-08-16T22:00:05.000Z'))
    assert.equal(progress.eta.label, 'Generating…')
  })

  it('smoothEtaRemainingMs dampens jumps', () => {
    const first = smoothEtaRemainingMs(null, 120_000)
    assert.equal(first, 120_000)
    const second = smoothEtaRemainingMs(first, 30_000)
    assert.ok(second != null && second > 30_000 && second < 120_000)
  })

  it('completion state reaches 100% with deliverable media', () => {
    const snapshot = buildSnapshot({
      production: {
        status: 'producing',
        reel_url: 'https://cdn.example/reel.mp4',
        export_status: 'completed',
        current_stage: 'export',
      },
      stages: V7_ALL_STAGES.map((id) =>
        stageRow(id, id === 'export' ? 'queued' : 'completed', {
          output: { durationMs: 5000 },
        })
      ),
    })

    const progress = computeV7ProductionProgress(snapshot)
    assert.equal(progress.overallPercent, 100)
    assert.equal(progress.currentTask, 'Creation complete')
    assert.equal(progress.eta.label, 'Complete')
    assert.ok(progress.completionStats != null)
  })

  it('failed state freezes ETA and preserves last verified progress', () => {
    const snapshot = buildSnapshot({
      production: { status: 'failed', current_stage: 'script' },
      stages: [
        stageRow('idea', 'completed', { output: { durationMs: 8000 } }),
        stageRow('research', 'completed', { output: { durationMs: 14000 } }),
        stageRow('script', 'failed', { error: 'validation failed' }),
      ],
    })

    const progress = computeV7ProductionProgress(snapshot)
    assert.equal(progress.eta.frozen, true)
    assert.equal(progress.eta.label, 'Paused')
    assert.ok(progress.overallPercent > 0)
    assert.ok(progress.overallPercent < 100)
    assert.equal(progress.paused?.retryAvailable, true)
  })

  it('zero production history leaves historical average null', () => {
    const snapshot = buildSnapshot({ stages: [stageRow('idea', 'running')] })
    const progress = computeV7ProductionProgress(snapshot)
    assert.equal(progress.historicalAverageMs, null)
  })
})

describe('V7 production progress — utilities', () => {
  it('formatDurationMs renders human-readable durations', () => {
    assert.equal(formatDurationMs(8000), '8s')
    assert.equal(formatDurationMs(272_000), '4m 32s')
  })

  it('formatRemainingLabel prefixes estimate marker', () => {
    assert.match(formatRemainingLabel(138_000), /^~2m 18s remaining$/)
  })

  it('computeProductionElapsedMs uses created_at while running', () => {
    const snapshot = buildSnapshot({
      production: { created_at: '2026-08-16T22:00:00.000Z' },
      stages: [stageRow('idea', 'running')],
    })
    const elapsed = computeProductionElapsedMs(snapshot, new Date('2026-08-16T22:01:42.000Z'))
    assert.equal(elapsed, 102_000)
  })
})
