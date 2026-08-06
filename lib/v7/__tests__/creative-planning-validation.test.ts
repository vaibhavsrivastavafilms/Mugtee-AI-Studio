import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'

import {
  AI_PLANNING_DIRECTION_MAX,
  aiPlanningText,
  normalizeCreativeText,
} from '@/lib/v7/creative-planning-validation'
import { normalizeProductionPlanRaw, parseProductionPlan } from '@/agents/planner/schema'

describe('creative text normalization', () => {
  it('trims, collapses spaces, and normalizes newlines', () => {
    assert.equal(
      normalizeCreativeText('  dramatic   orchestral\r\nmusic\r\n\r\n\r\nwith ambience  '),
      'dramatic orchestral\nmusic\n\nwith ambience'
    )
  })

  it('converts null to undefined', () => {
    assert.equal(normalizeCreativeText(null), undefined)
  })
})

describe('long creative planning text', () => {
  const longMusicDirection =
    'Create a cinematic documentary score with realistic lighting cues, handheld movement sync, emotional narration support, dramatic orchestral swells, subtle rain ambience, distant thunder, warm string beds, sparse piano motifs, and high-end colour-grading-aware dynamics suitable for premium social delivery.'.repeat(
      8
    )

  it('accepts long music direction via aiPlanningText', () => {
    const schema = z.object({
      musicDirection: aiPlanningText(AI_PLANNING_DIRECTION_MAX),
    })

    const parsed = schema.parse({ musicDirection: longMusicDirection })
    assert.ok(parsed.musicDirection.length > 80)
    assert.ok(parsed.musicDirection.length <= AI_PLANNING_DIRECTION_MAX)
  })

  it('accepts long style and music in production planner normalization', () => {
    const pixarPrompt =
      'Use Pixar-inspired 3D animation with expressive characters, warm lighting, realistic textures, premium social-media editing suitable for Instagram Reels, YouTube Shorts, and TikTok. Include playful camera moves, saturated but tasteful colour, and emotionally readable facial animation.'

    const plan = parseProductionPlan(
      normalizeProductionPlanRaw(
        {
          title: 'Pixar Social Spot',
          style: pixarPrompt,
          music: longMusicDirection,
          voice: 'Warm, expressive, family-friendly narrator with clear diction and gentle humour.',
        },
        pixarPrompt
      )
    )

    assert.ok(plan.style.length > 80)
    assert.ok(plan.music.length > 80)
  })
})
