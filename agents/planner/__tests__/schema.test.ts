import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  inferDurationSecFromPrompt,
  normalizeProductionPlanning,
  planSceneCountForDuration,
} from '@/lib/v7/production-planning'
import { normalizeProductionPlanRaw, parseProductionPlan } from '@/agents/planner/schema'

describe('production planning', () => {
  it('infers 10 second duration from prompt', () => {
    assert.equal(
      inferDurationSecFromPrompt('Create a 10 second black and white video'),
      10
    )
  })

  it('infers 2 minute duration from prompt', () => {
    assert.equal(inferDurationSecFromPrompt('Create a 2 minute documentary'), 120)
  })

  it('plans 2 scenes for a 10 second film', () => {
    const plan = normalizeProductionPlanning({
      prompt: 'Create a 10 second black and white video',
      duration: 10,
    })
    assert.equal(plan.duration, 10)
    assert.equal(plan.sceneCount, 2)
    assert.equal(plan.shotCount, 4)
    assert.equal(plan.timelineLength, 10)
  })

  it('plans 1-2 scenes for a 5 second logo reveal', () => {
    const scenes = planSceneCountForDuration(5)
    assert.ok(scenes >= 1 && scenes <= 2)
  })
})

describe('planner schema normalization', () => {
  it('coerces string numbers and platform aliases', () => {
    const plan = parseProductionPlan(
      normalizeProductionPlanRaw({
        title: 'Monsoon Restaurant Ad',
        duration: '45',
        platform: 'youtube shorts',
        language: 'English',
        aspectRatio: '9:16',
        style: 'Cinematic',
        sceneCount: '6',
        voice: 'Warm',
        music: 'Emotional',
      }),
      '45 second restaurant ad'
    )

    assert.equal(plan.duration, 45)
    assert.equal(plan.platform, 'YouTube Shorts')
    assert.equal(plan.sceneCount, 6)
    assert.equal(plan.characterConsistency, false)
  })

  it('defaults missing optional fields', () => {
    const plan = parseProductionPlan(normalizeProductionPlanRaw({ title: 'Test Ad' }))
    assert.equal(plan.duration, 30)
    assert.equal(plan.platform, 'YouTube Shorts')
    assert.ok(plan.voice.length > 0)
  })

  it('accepts 10 second black and white brief', () => {
    const plan = parseProductionPlan(
      normalizeProductionPlanRaw(
        {
          title: 'B&W Film',
          duration: 10,
          platform: 'Instagram',
          language: 'English',
          aspectRatio: '9:16',
          style: 'black and white',
          sceneCount: 2,
          voice: 'Silent',
          music: 'Minimal',
          characterConsistency: false,
        },
        'Create a 10 second black and white video'
      )
    )

    assert.equal(plan.duration, 10)
    assert.equal(plan.sceneCount, 2)
    assert.equal(plan.style, 'black and white')
  })

  it('normalizes success-criteria prompts without hard minimums', () => {
    const cases = [
      { prompt: 'Create a 5 second logo reveal', duration: 5 },
      { prompt: 'Create a 10 second black and white film', duration: 10 },
      { prompt: 'Create a 15 second Instagram Reel', duration: 15 },
      { prompt: 'Create a 30 second cinematic advertisement', duration: 30 },
      { prompt: 'Create a 2 minute documentary', duration: 120 },
    ] as const

    for (const { prompt, duration } of cases) {
      const plan = parseProductionPlan(
        normalizeProductionPlanRaw({ title: 'Test' }, prompt)
      )
      assert.equal(plan.duration, duration, prompt)
      assert.ok(plan.sceneCount >= 1, prompt)
    }
  })
})
