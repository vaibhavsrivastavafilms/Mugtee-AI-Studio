import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPollinationsVideoEstimate,
  computeClipPlan,
  estimatePollenForClips,
  parsePollinationsVideoCatalogModel,
  resolveResolutionLabel,
  selectPricingForResolution,
} from '@/lib/pollinations/video-estimate-core'

describe('Pollinations video cost estimator', () => {
  it('resolves 720x1080 to 720p', () => {
    assert.equal(resolveResolutionLabel(720, 1080), '720p')
  })

  it('computes clip plan for 30s at 15s max', () => {
    const plan = computeClipPlan({ totalDurationSec: 30, maxClipDurationSec: 15 })
    assert.equal(plan.clipsRequired, 2)
    assert.equal(plan.clipDurations.reduce((a, b) => a + b, 0), 30)
  })

  it('uses live pricing fields including per-request I2V cost', () => {
    const raw = {
      name: 'wan-fast',
      category: 'video',
      input_modalities: ['text', 'image'],
      output_modalities: ['video'],
      video_capabilities: ['start_frame'],
      paid_only: true,
      pricing: {
        currency: 'pollen',
        promptImageTokens: '0.01',
        completionVideoSeconds: '0.01',
      },
      resolutions: ['720p'],
    }
    const model = parsePollinationsVideoCatalogModel(raw)
    assert.ok(model)
    const pricing = selectPricingForResolution(model!, raw, '720p')
    const { estimatedTotalPollen } = estimatePollenForClips({
      pricing,
      clipDurations: [15, 15],
    })
    assert.equal(estimatedTotalPollen, 2 * (0.01 + 0.01 * 15))
  })

  it('picks cheapest I2V model for 30s', () => {
    const cheap = {
      raw: {
        name: 'cheap-i2v',
        category: 'video',
        input_modalities: ['image'],
        output_modalities: ['video'],
        video_capabilities: ['start_frame'],
        pricing: { completionVideoSeconds: '0.01', promptImageTokens: '0' },
        resolutions: ['720p'],
      },
      model: parsePollinationsVideoCatalogModel({
        name: 'cheap-i2v',
        category: 'video',
        input_modalities: ['image'],
        output_modalities: ['video'],
        video_capabilities: ['start_frame'],
        pricing: { completionVideoSeconds: '0.01', promptImageTokens: '0' },
        resolutions: ['720p'],
      })!,
    }
    const expensive = {
      raw: {
        name: 'expensive-i2v',
        category: 'video',
        input_modalities: ['image'],
        output_modalities: ['video'],
        video_capabilities: ['start_frame'],
        pricing: { completionVideoSeconds: '0.2', promptImageTokens: '0.05' },
        resolutions: ['720p'],
      },
      model: parsePollinationsVideoCatalogModel({
        name: 'expensive-i2v',
        category: 'video',
        input_modalities: ['image'],
        output_modalities: ['video'],
        video_capabilities: ['start_frame'],
        pricing: { completionVideoSeconds: '0.2', promptImageTokens: '0.05' },
        resolutions: ['720p'],
      })!,
    }

    const result = buildPollinationsVideoEstimate({
      catalog: [expensive, cheap],
      request: { durationSec: 30, width: 720, height: 1080, imageToVideoOnly: true },
      catalogSource: 'test',
      spendablePollen: 10,
    })

    assert.equal(result.recommended?.model, 'cheap-i2v')
    assert.equal(result.recommended?.clipsRequired, 2)
  })
})
