import assert from 'node:assert/strict'
import test from 'node:test'

import {
  matchesOllamaModel,
  selectBestInstalledOllamaModel,
} from '../ollama'

test('matchesOllamaModel handles tags and variants', () => {
  assert.equal(matchesOllamaModel('llama3.2:latest', 'llama3.2'), true)
  assert.equal(matchesOllamaModel('llama3.2:3b', 'llama3.2:3b'), true)
  assert.equal(matchesOllamaModel('mistral:latest', 'mistral'), true)
  assert.equal(matchesOllamaModel('qwen2.5:7b', 'qwen2.5'), true)
  assert.equal(matchesOllamaModel('phi4:latest', 'phi4'), true)
})

test('selectBestInstalledOllamaModel prefers priority over requested missing model', () => {
  const selected = selectBestInstalledOllamaModel(['qwen2.5:latest', 'llama3.2:latest'], {
    requested: 'mistral',
  })
  assert.equal(selected, 'llama3.2:latest')
})

test('selectBestInstalledOllamaModel honors installed requested model', () => {
  const selected = selectBestInstalledOllamaModel(['mistral:latest', 'llama3.2:latest'], {
    requested: 'mistral',
  })
  assert.equal(selected, 'mistral:latest')
})
