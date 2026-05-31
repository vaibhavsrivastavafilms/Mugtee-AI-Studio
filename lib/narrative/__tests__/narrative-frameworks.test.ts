import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  NARRATIVE_FRAMEWORK_IDS,
  selectNarrativeFramework,
} from '@/lib/narrative/narrative-frameworks'

describe('selectNarrativeFramework', () => {
  it('returns one of the five core frameworks', () => {
    const picked = selectNarrativeFramework('psychology', [], 'seed-1')
    assert.ok(NARRATIVE_FRAMEWORK_IDS.includes(picked.id))
    assert.ok(picked.beatStructure.length >= 4)
  })

  it('avoids consecutive reuse when history has a last framework', () => {
    const first = selectNarrativeFramework('business', [], 'biz-a')
    const second = selectNarrativeFramework('business', [first.id], 'biz-b')
    assert.notEqual(second.id, first.id)
  })
})
