import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseCreatorIntentSync,
} from '@/lib/input-understanding/intent-extraction'
import { sanitizeForGeneration } from '@/lib/input-understanding/clean-generation-context'
import {
  containsInstructionLeak,
  titlePassesValidation,
  hookPassesValidation,
} from '@/lib/input-understanding/output-validation'

describe('intent-extraction', () => {
  it('strips help me create from psychology short input', () => {
    const raw = 'Help me create a viral psychology short'
    const intent = parseCreatorIntentSync(raw)

    assert.equal(intent.niche, 'psychology')
    assert.equal(intent.goal, 'viral')
    assert.equal(intent.platform, 'shorts')
    assert.match(intent.cleanTopic.toLowerCase(), /psychology/)
    assert.doesNotMatch(intent.cleanTopic.toLowerCase(), /help me/)
  })

  it('sanitizeForGeneration removes instruction verbs', () => {
    const cleaned = sanitizeForGeneration('Help me create a viral psychology short')
    assert.doesNotMatch(cleaned.toLowerCase(), /help me/)
    assert.match(cleaned.toLowerCase(), /psychology/)
  })

  it('rejects title that leaks raw prompt', () => {
    const raw = 'Help me create a viral psychology short'
    const badTitle = 'Help me create a viral psychology short — On Record'
    assert.equal(titlePassesValidation(badTitle, raw), false)
    assert.equal(containsInstructionLeak(badTitle, raw), true)
  })

  it('accepts clean psychology title', () => {
    const raw = 'Help me create a viral psychology short'
    assert.equal(titlePassesValidation('Psychology — On Record', raw), true)
  })

  it('rejects hook that embeds user instruction', () => {
    const raw = 'Help me create a viral psychology short'
    const badHook =
      'Nine out of ten creators quit before Help me create a viral psychology short...'
    assert.equal(hookPassesValidation(badHook, raw), false)
  })
})
