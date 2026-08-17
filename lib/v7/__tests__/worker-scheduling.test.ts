import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import type { V7ProductionSnapshot, V7StageRow } from '@/types/v7/production'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

const { shouldDrivePipeline } = require('@/lib/v7/pipeline-sync.server') as typeof import('@/lib/v7/pipeline-sync.server')

function stageRow(
  stage: V7StageRow['stage'],
  status: V7StageRow['status'],
  overrides: Partial<V7StageRow> = {}
): V7StageRow {
  return {
    id: `${stage}-id`,
    production_id: '3b29baa9-a45b-43e4-a479-8837c285f89e',
    stage,
    status,
    input: null,
    output: null,
    error: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-08-16T22:12:00.000Z',
    ...overrides,
  }
}

function buildRunnableAnimationSnapshot(
  lock: Record<string, unknown> | null = null
): V7ProductionSnapshot {
  return {
    production: {
      id: '3b29baa9-a45b-43e4-a479-8837c285f89e',
      user_id: 'user-1',
      title: 'Raindrop to Rice',
      prompt: 'Monsoon food reel',
      status: 'producing',
      creative_brief: {
        title: 'Raindrop to Rice',
        duration: 30,
        platform: 'Instagram',
        language: 'en',
        aspectRatio: '9:16',
        genre: 'Food',
        style: 'cinematic',
        sceneCount: 6,
        voiceDirection: 'calm',
        musicDirection: 'monsoon',
        emotion: 'cozy',
        audience: 'food lovers',
        characterConsistency: true,
      },
      current_stage: 'animation',
      reel_url: null,
      mov_url: null,
      thumbnail_url: null,
      creator_pack_url: null,
      export_status: 'pending',
      timeline_json: lock ? { pipeline_lock: lock } : { pipeline_lock: { locked: false } },
      voice_url: 'https://cdn.example/voice.mp3',
      music_url: null,
      created_at: '2026-08-16T22:12:23.891Z',
      updated_at: '2026-08-16T22:19:02.717Z',
    },
    stages: [
      stageRow('idea', 'completed', {
        output: { brief: { title: 'Raindrop to Rice' }, concepts: [] },
      }),
      stageRow('research', 'completed', { output: { research: { topics: ['food'] } } }),
      stageRow('creative', 'completed', { output: { direction: { visualStyle: 'cinematic' } } }),
      stageRow('script', 'completed', {
        output: { script: { scenes: [{ number: 1, narration: 'Hello' }] } },
      }),
      stageRow('voice', 'completed', { output: { voiceUrl: 'https://cdn.example/voice.mp3' } }),
      stageRow('character', 'completed', { output: { characters: [] } }),
      stageRow('world', 'completed', { output: { world: {} } }),
      stageRow('storyboard', 'completed', { output: { storyboard: { scenes: [] } } }),
      stageRow('image', 'completed', {
        output: {
          images: [
            'https://cdn.example/1.png',
            'https://cdn.example/2.png',
            'https://cdn.example/3.png',
            'https://cdn.example/4.png',
            'https://cdn.example/5.png',
            'https://cdn.example/6.png',
          ],
        },
      }),
      stageRow('animation', 'queued', { input: { brief: {} } }),
    ],
    scenes: Array.from({ length: 6 }, (_, i) => ({
      id: `scene-${i + 1}`,
      production_id: '3b29baa9-a45b-43e4-a479-8837c285f89e',
      number: i + 1,
      script: {},
      storyboard: {
        imageUrl: `https://cdn.example/${i + 1}.png`,
        imageCheckpointAt: '2026-08-16T22:18:59.967Z',
        imageMetadata: {
          promptArchive: { action: 'Steam rises from the pot' },
        },
      },
      duration: 5,
      created_at: '2026-08-16T22:16:00.000Z',
    })),
    timeline: [],
  }
}

describe('worker scheduling — runnable animation after image checkpoints', () => {
  it('shouldDrivePipeline is true when animation is queued and lock is released', () => {
    assert.equal(shouldDrivePipeline(buildRunnableAnimationSnapshot()), true)
  })

  it('shouldDrivePipeline stays true when only a stale orphan lock remains on the same production', () => {
    const snapshot = buildRunnableAnimationSnapshot({
      locked: true,
      stage: 'image',
      since: '2026-08-06T18:48:23.186Z',
      token: 'stale-zombie',
    })
    assert.equal(shouldDrivePipeline(snapshot), true)
  })

  it('shouldDrivePipeline is false while another stage is actively running', () => {
    const snapshot = buildRunnableAnimationSnapshot()
    snapshot.stages = snapshot.stages.map((row) =>
      row.stage === 'animation'
        ? { ...row, status: 'running', started_at: new Date().toISOString() }
        : row
    )
    assert.equal(shouldDrivePipeline(snapshot), false)
  })
})
