import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { remotionChromeModeForExecutable } from '../serverless-browser.core'

describe('Remotion serverless browser packaging', () => {
  it('keeps Remotion headless-shell when no packaged executable is provided', () => {
    assert.equal(remotionChromeModeForExecutable(null), 'headless-shell')
  })

  it('uses chrome-for-testing flags for the packaged Chromium binary', () => {
    assert.equal(remotionChromeModeForExecutable('/tmp/chromium'), 'chrome-for-testing')
  })

  it('ships Chromium and Amazon Linux 2023 library archives in node_modules', () => {
    const bin = path.join(process.cwd(), 'node_modules', '@sparticuz', 'chromium', 'bin')
    const chromium = path.join(bin, 'chromium.br')
    const al2023 = path.join(bin, 'al2023.tar.br')
    assert.ok(fs.existsSync(chromium), chromium)
    assert.ok(fs.existsSync(al2023), al2023)
    assert.ok(fs.statSync(chromium).size > 1_000_000)
    assert.ok(fs.statSync(al2023).size > 0)
    assert.ok(!chromium.includes(`${path.sep}node_modules${path.sep}.remotion`))
  })
})
