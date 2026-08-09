import assert from 'node:assert/strict'
import { accessSync, constants } from 'node:fs'
import test from 'node:test'

import {
  findOfficialOllamaLauncher,
  resolveRepositoryRoot,
} from '../ollama-executable'

function pathIsFile(candidate: string): boolean {
  try {
    accessSync(candidate, constants.F_OK)
    return true
  } catch {
    return false
  }
}

test('resolveRepositoryRoot finds repo from module path', () => {
  const repoRoot = resolveRepositoryRoot()
  assert.ok(repoRoot, 'expected repository root')
})

test('findOfficialOllamaLauncher prefers Desktop install when present', () => {
  const discovery = findOfficialOllamaLauncher({ force: true })
  if (discovery.launcher) {
    assert.ok(pathIsFile(discovery.launcher), discovery.launcher)
    assert.ok(discovery.candidates.length > 0)
  }
})
