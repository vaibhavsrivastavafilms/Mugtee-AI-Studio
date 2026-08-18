/**
 * Build-time Remotion compositor glibc 2.35 patch for Vercel Amazon Linux 2023.
 *
 * Official mechanism: remotion-dev/remotion packages/vercel patch-compositor
 * (Ubuntu 22.04 libc6 + patchelf). Adapted to run at install/build so the
 * serverless function does not download glibc at runtime.
 *
 * Skip on Windows / non-linux. Require success on Vercel Linux.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LIBC6_URL = 'https://launchpadlibrarian.net/612471225/libc6_2.35-0ubuntu3.1_amd64.deb'
const LIBC6_FALLBACK = 'https://remotion.media/libc6_2.35-0ubuntu3.1_amd64.deb'
const INTERPRETER = '/tmp/glibc235/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2'
const RPATH = '/tmp/glibc235/lib/x86_64-linux-gnu:$ORIGIN'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const compositorDir = path.join(root, 'node_modules', '@remotion', 'compositor-linux-x64-gnu')
const compositorBin = path.join(compositorDir, 'remotion')
const bundleDir = path.join(compositorDir, 'glibc235')
const marker = path.join(bundleDir, '.patched')
const requiredOnVercel = process.env.VERCEL === '1'

function log(...args) {
  console.log('[patch-remotion-compositor]', ...args)
}

function fail(message) {
  console.error('[patch-remotion-compositor]', message)
  if (requiredOnVercel) process.exit(1)
  process.exit(0)
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  return result
}

if (process.platform !== 'linux' || process.arch !== 'x64') {
  log(`skip (${process.platform}/${process.arch})`)
  process.exit(0)
}

if (!fs.existsSync(compositorBin)) {
  fail(`compositor binary missing: ${compositorDir}`)
}

if (fs.existsSync(marker) && fs.existsSync(path.join(bundleDir, 'lib', 'x86_64-linux-gnu', 'libm.so.6'))) {
  log('already patched')
  process.exit(0)
}

for (const bin of ['patchelf', 'ar', 'tar', 'zstd', 'curl']) {
  const which = run(process.platform === 'win32' ? 'where' : 'which', [bin])
  if (which.status !== 0) {
    fail(`required build tool missing: ${bin}`)
  }
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'mugtee-libc6-'))
const debPath = path.join(work, 'libc6.deb')

log('downloading Ubuntu 22.04 libc6 2.35 (Remotion official URLs)')
let curl = run('curl', ['-fsSL', '-o', debPath, LIBC6_URL])
if (curl.status !== 0 || !fs.existsSync(debPath) || fs.statSync(debPath).size < 1000) {
  log('primary libc6 URL failed, using remotion.media fallback')
  curl = run('curl', ['-fsSL', '-o', debPath, LIBC6_FALLBACK])
}
if (curl.status !== 0 || !fs.existsSync(debPath) || fs.statSync(debPath).size < 1000) {
  fail(`failed to download libc6: ${curl.stderr || curl.stdout}`)
}

const ar = run('ar', ['x', debPath], { cwd: work })
if (ar.status !== 0) fail(`ar x failed: ${ar.stderr || ar.stdout}`)

const zst = path.join(work, 'data.tar.zst')
const tarFile = path.join(work, 'data.tar')
if (fs.existsSync(zst)) {
  const z = run('zstd', ['-d', zst, '-o', tarFile])
  if (z.status !== 0) fail(`zstd -d failed: ${z.stderr || z.stdout}`)
} else if (!fs.existsSync(tarFile) && !fs.existsSync(path.join(work, 'data.tar.xz'))) {
  const dataTar = fs.readdirSync(work).find((name) => name.startsWith('data.tar'))
  if (!dataTar) fail(`data.tar* missing after ar x: ${fs.readdirSync(work).join(', ')}`)
}

fs.mkdirSync(bundleDir, { recursive: true })
const tarInput = fs.existsSync(tarFile)
  ? tarFile
  : path.join(work, fs.readdirSync(work).find((name) => name.startsWith('data.tar')))
const tar = run('tar', ['xf', tarInput, '-C', bundleDir, '--strip-components=1'])
if (tar.status !== 0) fail(`tar xf failed: ${tar.stderr || tar.stdout}`)

const libm = path.join(bundleDir, 'lib', 'x86_64-linux-gnu', 'libm.so.6')
const ldSo = path.join(bundleDir, 'lib', 'x86_64-linux-gnu', 'ld-linux-x86-64.so.2')
if (!fs.existsSync(libm) || !fs.existsSync(ldSo)) {
  fail(`extracted libc6 missing libm/ld-linux under ${bundleDir}`)
}

const patched = run('patchelf', [
  '--set-interpreter',
  INTERPRETER,
  '--force-rpath',
  '--set-rpath',
  RPATH,
  compositorBin,
])
if (patched.status !== 0) {
  const fallback = run('patchelf', [
    '--set-interpreter',
    INTERPRETER,
    '--set-rpath',
    RPATH,
    compositorBin,
  ])
  if (fallback.status !== 0) {
    fail(`patchelf failed: ${patched.stderr || fallback.stderr}`)
  }
}

try {
  fs.chmodSync(compositorBin, 0o755)
  fs.chmodSync(ldSo, 0o755)
} catch {
  /* ignore */
}

const printed = run('patchelf', ['--print-interpreter', compositorBin])
if (!printed.stdout?.includes('/tmp/glibc235/')) {
  fail(`interpreter not patched: ${printed.stdout || printed.stderr}`)
}

fs.writeFileSync(
  marker,
  JSON.stringify(
    {
      interpreter: INTERPRETER,
      rpath: RPATH,
      libc6: '2.35-0ubuntu3.1',
      remotion: '4.0.490 compositor-linux-x64-gnu',
    },
    null,
    2
  )
)

try {
  fs.rmSync(work, { recursive: true, force: true })
} catch {
  /* ignore */
}

log('patched compositor for glibc 2.35', compositorBin)
process.exit(0)
