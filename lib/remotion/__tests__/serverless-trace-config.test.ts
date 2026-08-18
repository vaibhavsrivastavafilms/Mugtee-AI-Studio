import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextConfig = require('../../../next.config.js')

describe('Remotion serverless NFT trace config', () => {
  it('includes Linux compositor binaries for V7 production routes', () => {
    const includes = nextConfig.experimental?.outputFileTracingIncludes as
      | Record<string, string[]>
      | undefined
    assert.ok(includes)

    for (const route of [
      '/api/v7/productions/[id]',
      '/api/v7/productions/[id]/retry',
      '/api/cron/v7-advance',
      '/api/render/reel',
    ]) {
      const globs = includes[route]
      assert.ok(globs, `missing outputFileTracingIncludes for ${route}`)
      assert.ok(
        globs.some((g) => g.includes('@remotion/compositor-linux-x64-gnu')),
        `Linux compositor glob missing for ${route}`
      )
      assert.ok(
        globs.some((g) => g.includes('@sparticuz/chromium')),
        `Serverless Chromium glob missing for ${route}`
      )
      assert.ok(
        globs.some((g) => g.includes('lib/remotion')),
        `Remotion sources missing for ${route}`
      )
    }
  })
})
