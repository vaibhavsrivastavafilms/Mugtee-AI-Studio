import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'

import { remotionWebpackOverride } from '../webpack-override'

describe('remotionWebpackOverride', () => {
  it('maps @ to the repo root and @/lib to ./lib (not src)', () => {
    const root = process.cwd()
    const config = remotionWebpackOverride({ resolve: { alias: {} } } as never)
    assert.ok(config && typeof config === 'object' && !('then' in config))
    const alias = (config as { resolve?: { alias?: Record<string, string> } }).resolve?.alias

    assert.ok(alias)
    assert.equal(alias['@'], root)
    assert.equal(alias['@/lib'], path.resolve(root, 'lib'))
    assert.notEqual(alias['@'], path.resolve(root, 'src'))
    assert.ok(!String(alias['@/lib']).endsWith(`${path.sep}src${path.sep}lib`))
  })
})
