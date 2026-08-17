import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'

import {
  normalizeStoryboardTiming,
  resolveStoryboardShotTimingSeconds,
} from '@/lib/v7/storyboard-timing.core'
import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'

const timingSchema = z.coerce.number().positive()

function scriptWithDurations(durations: number[]): V7ScriptDocument {
  return {
    scenes: durations.map((duration, index) => ({
      number: index + 1,
      title: `Scene ${index + 1}`,
      duration,
      location: 'Ahmedabad street food stall',
      characters: ['Host'],
      dialogue: '',
      action: 'Steam rises from hot snacks.',
      camera: 'Medium shot',
      lighting: 'Warm monsoon light',
      movement: 'Slow push-in',
      emotion: 'Craving',
      transition: 'Cut',
      narration: 'Monsoon ma street food no swaad alag che.',
    })),
  }
}

function storyboardShot(timing: unknown) {
  return {
    camera: 'Medium shot',
    lens: '35mm',
    composition: 'Rule of thirds',
    movement: 'Static',
    lighting: 'Warm practicals',
    dialogue: '',
    emotion: 'Calm',
    timing,
  }
}

describe('storyboard shot timing normalization', () => {
  it('keeps positive LLM timing values', () => {
    assert.equal(resolveStoryboardShotTimingSeconds(4.5, 2), 4.5)
    assert.equal(resolveStoryboardShotTimingSeconds('6', 2), 6)
  })

  it('replaces zero, missing, or invalid timing with script-derived fallback', () => {
    const script = scriptWithDurations([12])
    const raw = {
      scenes: [
        {
          number: 1,
          shots: [storyboardShot(0), storyboardShot(null), storyboardShot(undefined)],
        },
      ],
    }

    const normalized = normalizeStoryboardTiming(raw, script) as typeof raw
    for (const shot of normalized.scenes[0].shots) {
      assert.equal(timingSchema.safeParse(shot.timing).success, true)
      assert.equal(shot.timing, 4)
    }
  })

  it('derives per-shot timing from matching screenplay scene duration', () => {
    const script = scriptWithDurations([10, 8])
    const raw = {
      scenes: [
        {
          number: 1,
          shots: [storyboardShot(0), storyboardShot('bad')],
        },
        {
          number: 2,
          shots: [storyboardShot(0)],
        },
      ],
    }

    const normalized = normalizeStoryboardTiming(raw, script) as typeof raw
    assert.deepEqual(
      normalized.scenes[0].shots.map((shot) => shot.timing),
      [5, 5]
    )
    assert.equal(normalized.scenes[1].shots[0].timing, 8)
  })

  it('falls back to scene index when storyboard scene numbers are missing', () => {
    const script = scriptWithDurations([6])
    const raw = {
      scenes: [
        {
          number: 'not-a-number',
          shots: [storyboardShot(0)],
        },
      ],
    }

    const normalized = normalizeStoryboardTiming(raw, script) as typeof raw
    assert.equal(normalized.scenes[0].shots[0].timing, 6)
  })
})
