import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildScreenplayRepairUserPrompt,
  formatZodIssuePath,
  validateScreenplayDocument,
  v7ScriptSchema,
} from '@/agents/v7/script-schema'

function validScene(overrides: Record<string, unknown> = {}) {
  return {
    number: 1,
    title: 'Opening Hook',
    duration: 8,
    location: 'City rooftop at dawn',
    characters: ['Maya'],
    dialogue: '',
    action: 'Maya adjusts her camera as the skyline glows orange.',
    camera: 'Wide establishing shot, slow push-in',
    lighting: 'Soft golden hour rim light',
    movement: 'Gentle handheld drift',
    emotion: 'Hopeful anticipation',
    transition: 'Match cut',
    narration: 'Every sunrise is a second chance.',
    ...overrides,
  }
}

function validScreenplay(sceneCount = 1) {
  return {
    scenes: Array.from({ length: sceneCount }, (_, index) =>
      validScene({
        number: index + 1,
        title: `Scene ${index + 1}`,
        narration: `Narration for scene ${index + 1}.`,
        action: `Action for scene ${index + 1}.`,
      })
    ),
  }
}

describe('screenplay schema validation', () => {
  it('accepts a fully valid screenplay', () => {
    const result = validateScreenplayDocument(validScreenplay(2))
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.data.scenes.length, 2)
    }
  })

  it('rejects empty narration with an exact field path', () => {
    const invalid = validScreenplay(1)
    invalid.scenes[0].narration = ''
    const result = validateScreenplayDocument(invalid)
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.errors.some((line) => line.includes('scenes[0].narration')))
      assert.ok(result.errors.some((line) => line.includes('Too small')))
    }
  })

  it('rejects empty action', () => {
    const invalid = validScreenplay(1)
    invalid.scenes[0].action = '   '
    const result = validateScreenplayDocument(invalid)
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.errors.some((line) => line.includes('scenes[0].action')))
    }
  })

  it('rejects empty location', () => {
    const invalid = validScreenplay(1)
    invalid.scenes[0].location = ''
    const result = validateScreenplayDocument(invalid)
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.errors.some((line) => line.includes('scenes[0].location')))
    }
  })

  it('rejects missing scenes array', () => {
    const result = validateScreenplayDocument({})
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.errors.some((line) => line.includes('scenes')))
    }
  })

  it('rejects malformed scene objects', () => {
    const result = validateScreenplayDocument({ scenes: [{}] })
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.ok(result.errors.length > 0)
    }
  })

  it('allows empty dialogue when other required fields are present', () => {
    const result = validateScreenplayDocument(validScreenplay(1))
    assert.equal(result.ok, true)
  })
})

describe('screenplay repair prompt', () => {
  it('includes exact validation errors and requires complete JSON', () => {
    const invalid = validScreenplay(2)
    invalid.scenes[1].narration = ''
    const validation = validateScreenplayDocument(invalid)
    assert.equal(validation.ok, false)
    if (!validation.ok) {
      const prompt = buildScreenplayRepairUserPrompt({
        baseUserPrompt: 'BRIEF:\n{}',
        validationErrors: validation.errors,
      })
      assert.match(prompt, /SCHEMA VALIDATION FAILURE/)
      assert.match(prompt, /scenes\[1\]\.narration/)
      assert.match(prompt, /COMPLETE corrected screenplay JSON/)
    }
  })

  it('simulates repair acceptance after correcting empty narration', () => {
    const invalid = validScreenplay(1)
    invalid.scenes[0].narration = ''
    const first = validateScreenplayDocument(invalid)
    assert.equal(first.ok, false)

    const repaired = validScreenplay(1)
    const second = validateScreenplayDocument(repaired)
    assert.equal(second.ok, true)
  })
})

describe('screenplay validation helpers', () => {
  it('formats nested zod paths', () => {
    assert.equal(formatZodIssuePath(['scenes', 2, 'narration']), 'scenes[2].narration')
  })

  it('preserves min(1) constraints on required fields', () => {
    const parsed = v7ScriptSchema.safeParse({
      scenes: [validScene({ narration: '' })],
    })
    assert.equal(parsed.success, false)
  })
})
