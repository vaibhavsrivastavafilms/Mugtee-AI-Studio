import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

import {
  applyRemotionWritableCacheDir,
  getRemotionWritableDir,
} from '../writable-work-dir'

const require = createRequire(path.join(process.cwd(), 'package.json'))

describe('Remotion writable work dir', () => {
  it('lives under os.tmpdir() and not under node_modules/.remotion', () => {
    const dir = getRemotionWritableDir()
    assert.equal(dir, path.join(os.tmpdir(), 'remotion'))
    assert.ok(dir.startsWith(os.tmpdir()))
    assert.ok(!dir.includes(`${path.sep}node_modules${path.sep}.remotion`))
  })

  it('redirects Remotion Chrome download cache away from node_modules/.remotion', () => {
    const dir = applyRemotionWritableCacheDir()
    const dest = require(
      path.join(
        process.cwd(),
        'node_modules',
        '@remotion',
        'renderer',
        'dist',
        'browser',
        'get-download-destination.js'
      )
    ) as { getDownloadsCacheDir: () => string }
    assert.equal(dest.getDownloadsCacheDir(), dir)
    assert.ok(fs.existsSync(dir))
    assert.ok(!dest.getDownloadsCacheDir().includes(`${path.sep}node_modules${path.sep}.remotion`))
  })
})
