import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  checkPollenSpendAllowed,
  parseSafeExecutionCliArgs,
  readSafeExecutionState,
  assertPriorSceneApproved,
  V7_SAFE_EXECUTION_DEFAULT_MAX_POLLEN,
} from '@/lib/v7/safe-execution-core'

describe('V7 safe execution core', () => {
  it('parses scene and max-pollen flags', () => {
    const args = parseSafeExecutionCliArgs([
      '9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc',
      '--scene',
      '1',
      '--max-pollen',
      '0.10',
    ])
    assert.equal(args.productionId, '9f90d8a3-f7b6-4b6b-9ebe-fa9083c30ebc')
    assert.equal(args.sceneNumber, 1)
    assert.equal(args.maxPollen, 0.1)
    assert.equal(args.force, false)
  })

  it('defaults max pollen to 0.10', () => {
    const args = parseSafeExecutionCliArgs(['prod-id', '--scene', '2'])
    assert.equal(args.maxPollen, V7_SAFE_EXECUTION_DEFAULT_MAX_POLLEN)
  })

  it('blocks spend when estimate exceeds max pollen', () => {
    const result = checkPollenSpendAllowed({
      estimatedCost: 0.2,
      maxPollen: 0.1,
      availableBalance: 5,
    })
    assert.equal(result.allowed, false)
    if (!result.allowed) {
      assert.equal(result.code, 'POLLEN_SPEND_BLOCKED')
      assert.equal(result.reason, 'estimated_cost_exceeds_max_pollen')
    }
  })

  it('blocks spend when estimate exceeds available balance', () => {
    const result = checkPollenSpendAllowed({
      estimatedCost: 0.05,
      maxPollen: 0.1,
      availableBalance: 0.01,
    })
    assert.equal(result.allowed, false)
    if (!result.allowed) {
      assert.equal(result.reason, 'estimated_cost_exceeds_available_balance')
    }
  })

  it('requires prior scene approval before scene 2', () => {
    const state = readSafeExecutionState({})
    assert.throws(() => assertPriorSceneApproved(state, 2), /AWAITING_PRIOR_SCENE_APPROVAL/)
  })
})
