import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

import {
  COMPOSITOR_LINUX_GNU_DIR,
  compositorGlibcBundleDir,
  compositorGlibcRuntimeDir,
  REMOTION_GLIBC_INTERPRETER,
  REMOTION_GLIBC_LIBM,
  REMOTION_GLIBC_RUNTIME_NAME,
} from '../serverless-compositor-glibc.core'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const pkg = require('./package.json')
const nextConfig = require('./next.config.js')

describe('Remotion compositor glibc 2.35 compatibility', () => {
  it('uses Remotion official /tmp/glibc235 interpreter paths', () => {
    assert.equal(REMOTION_GLIBC_RUNTIME_NAME, 'glibc235')
    assert.equal(
      REMOTION_GLIBC_INTERPRETER,
      '/tmp/glibc235/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2'
    )
    assert.equal(REMOTION_GLIBC_LIBM, '/tmp/glibc235/lib/x86_64-linux-gnu/libm.so.6')
    assert.equal(compositorGlibcRuntimeDir(os.tmpdir()), path.join(os.tmpdir(), 'glibc235'))
    assert.ok(compositorGlibcBundleDir(process.cwd()).endsWith(path.join(COMPOSITOR_LINUX_GNU_DIR, 'glibc235')))
  })

  it('wires the build-time patch into postinstall and Vercel install tools', () => {
    assert.ok(String(pkg.scripts.postinstall).includes('patch-remotion-compositor-glibc.mjs'))
    const vercel = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'))
    assert.match(String(vercel.installCommand), /patchelf/)
    assert.match(String(vercel.installCommand), /zstd/)
    assert.match(String(vercel.installCommand), /binutils/)
    assert.ok(fs.existsSync(path.join(process.cwd(), 'scripts', 'patch-remotion-compositor-glibc.mjs')))
  })

  it('keeps compositor NFT glob so glibc235 is traced with the binary', () => {
    const includes = nextConfig.experimental?.outputFileTracingIncludes
    const globs = includes['/api/v7/productions/[id]']
    assert.ok(globs.some((g) => g.includes('@remotion/compositor-linux-x64-gnu')))
  })
})
