import { createRequire } from 'node:module'
import { before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { V7ProductionSnapshot } from '@/types/v7/production'

const require = createRequire(import.meta.url)
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
} as NodeModule

let buildMugteeProductionPollinationsEstimate: typeof import('@/lib/pollinations/production-estimate-core').buildMugteeProductionPollinationsEstimate
let extractMugteeProductionMediaFacts: typeof import('@/lib/pollinations/production-estimate-core').extractMugteeProductionMediaFacts
let PRODUCTION_ESTIMATE_SAFETY_BUFFER: typeof import('@/lib/pollinations/production-estimate-core').PRODUCTION_ESTIMATE_SAFETY_BUFFER
let parsePollinationsImageCatalogModel: typeof import('@/lib/pollinations/video-estimate-core').parsePollinationsImageCatalogModel
let parsePollinationsVideoCatalogModel: typeof import('@/lib/pollinations/video-estimate-core').parsePollinationsVideoCatalogModel

before(async () => {
  const core = await import('@/lib/pollinations/production-estimate-core')
  const pricing = await import('@/lib/pollinations/video-estimate-core')
  buildMugteeProductionPollinationsEstimate = core.buildMugteeProductionPollinationsEstimate
  extractMugteeProductionMediaFacts = core.extractMugteeProductionMediaFacts
  PRODUCTION_ESTIMATE_SAFETY_BUFFER = core.PRODUCTION_ESTIMATE_SAFETY_BUFFER
  parsePollinationsImageCatalogModel = pricing.parsePollinationsImageCatalogModel
  parsePollinationsVideoCatalogModel = pricing.parsePollinationsVideoCatalogModel
})

function mockSnapshot(): V7ProductionSnapshot {
  return {
    production: {
      id: 'prod-1',
      user_id: 'user-1',
      title: 'Test Production',
      prompt: 'test',
      status: 'failed',
      creative_brief: {
        title: 'Test',
        duration: 45,
        platform: 'YouTube Shorts',
        language: 'English',
        aspectRatio: '9:16',
        genre: 'Ad',
        style: 'Cinematic',
        sceneCount: 3,
        voiceDirection: 'Warm',
        musicDirection: 'Upbeat',
        emotion: 'Joy',
        audience: 'General',
        characterConsistency: true,
      },
      current_stage: 'animation',
      reel_url: null,
      mov_url: null,
      thumbnail_url: null,
      creator_pack_url: null,
      export_status: 'pending',
      timeline_json: null,
      voice_url: null,
      music_url: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    stages: [],
    scenes: [
      {
        id: 's1',
        production_id: 'prod-1',
        number: 1,
        duration: 5,
        script: { number: 1, title: 'A', duration: 5, dialogue: '', action: 'A', narration: 'A' },
        storyboard: { imageUrl: 'https://example.com/1.png', imageMetadata: { provider: 'pollinations' } },
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 's2',
        production_id: 'prod-1',
        number: 2,
        duration: 6,
        script: { number: 2, title: 'B', duration: 6, dialogue: '', action: 'B', narration: 'B' },
        storyboard: { imageUrl: 'https://example.com/2.png', imageMetadata: { provider: 'pollinations' } },
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 's3',
        production_id: 'prod-1',
        number: 3,
        duration: 5,
        script: { number: 3, title: 'C', duration: 5, dialogue: '', action: 'C', narration: 'C' },
        storyboard: {},
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    timeline: [],
  }
}

describe('Mugtee production Pollinations estimate', () => {
  it('extracts scene count and durations from snapshot', () => {
    const facts = extractMugteeProductionMediaFacts(mockSnapshot())
    assert.equal(facts.sceneCount, 3)
    assert.deepEqual(
      facts.scenes.map((scene) => scene.durationSec),
      [5, 6, 5]
    )
    assert.equal(facts.imageRequestCount, 3)
    assert.equal(facts.voiceUsesPollinations, false)
    assert.equal(facts.musicUsesPollinations, false)
  })

  it('totals video, image, and safety buffer from live pricing fields', () => {
    const videoRaw = {
      name: 'wan-fast',
      category: 'video',
      input_modalities: ['text', 'image'],
      output_modalities: ['video'],
      video_capabilities: ['start_frame'],
      pricing: { completionVideoSeconds: '0.01', promptImageTokens: '0' },
      resolutions: ['720p'],
    }
    const imageRaw = {
      name: 'flux',
      category: 'image',
      output_modalities: ['image'],
      pricing: { completionImageTokens: '0.004' },
      resolutions: ['720p'],
    }

    const facts = extractMugteeProductionMediaFacts(mockSnapshot())
    const estimate = buildMugteeProductionPollinationsEstimate({
      facts,
      catalog: {
        source: 'test',
        fetchedAt: '2026-01-01T00:00:00Z',
        videoEntries: [
          {
            raw: videoRaw,
            model: parsePollinationsVideoCatalogModel(videoRaw)!,
          },
        ],
        imageEntries: [
          {
            raw: imageRaw,
            model: parsePollinationsImageCatalogModel(imageRaw)!,
          },
        ],
      },
    })

    assert.equal(estimate.recommendedVideoModel, 'wan-fast')
    assert.equal(estimate.recommendedImageModel, 'flux')
    assert.equal(estimate.sceneVideos.length, 3)
    assert.equal(estimate.videoTotalPollen, (5 + 6 + 5) * 0.01)
    assert.equal(estimate.imageTotalPollen, 3 * 0.004)
    assert.ok(Math.abs(estimate.totals.recommendedBalancePollen - estimate.totals.production * 1.2) < 0.0001)
  })
})
