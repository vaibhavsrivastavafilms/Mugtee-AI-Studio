import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import type { V7ScriptDocument } from '@/agents/v7/script-writer.server'
import type { V7CreativeBrief } from '@/types/v7/production'
import {
  assertNarrationFitsBrief,
  buildNarrationSegmentsFromScript,
  joinNarrationText,
} from '@/lib/v7/voice-narration.server'

function brief(): V7CreativeBrief {
  return {
    title: 'Test',
    duration: 48,
    platform: 'Instagram',
    language: 'en',
    aspectRatio: '9:16',
    genre: 'Lifestyle',
    style: 'Cinematic',
    sceneCount: 6,
    voiceDirection: 'Confident',
    musicDirection: 'Ambient',
    emotion: 'Bold',
    audience: 'General',
    characterConsistency: true,
  }
}

describe('V7 narration separation', () => {
  it('uses only scene narration for voice segments', () => {
    const script: V7ScriptDocument = {
      scenes: [
        {
          number: 1,
          title: 'One',
          duration: 8,
          location: 'Street',
          characters: ['Runner'],
          dialogue: 'This dialogue should not enter narrator voice.',
          action: 'Close-up shoe lace tightening.',
          camera: 'Low angle',
          lighting: 'Dawn',
          movement: 'Push-in',
          emotion: 'Focused',
          transition: 'Cut',
          narration: 'Every step leaves a mark.',
        },
      ],
    }
    const segments = buildNarrationSegmentsFromScript({ script, brief: brief() })
    assert.equal(segments.length, 1)
    assert.equal(segments[0]?.text, 'Every step leaves a mark.')
    assert.equal(joinNarrationText(segments), 'Every step leaves a mark.')
  })

  it('fails fast when narration is too long for video duration', () => {
    const overlong = new Array(240).fill('word').join(' ')
    assert.throws(
      () =>
        assertNarrationFitsBrief({
          narrationText: overlong,
          briefDurationSec: 30,
          context: 'voice-stage',
        }),
      /narration too long/
    )
  })
})
