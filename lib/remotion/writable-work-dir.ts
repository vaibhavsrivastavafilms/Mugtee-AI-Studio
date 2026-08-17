import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import NodeModule from 'node:module'

/**
 * Remotion writes Chrome downloads to `node_modules/.remotion` (see
 * `@remotion/renderer` 4.0.490 `getDownloadsCacheDir`). That path is
 * read-only on Vercel serverless (`/var/task`). `os.tmpdir()` is `/tmp`
 * on Vercel Linux.
 *
 * 4.0.490 has no public cache-dir option or env var for Chrome downloads.
 * `bundle({ enableCaching: false })` is the official webpack-cache API
 * (also used by render-reel.server.ts).
 *
 * Next webpack rewrites `createRequire(...)` / `require.resolve(...)` and
 * can replace them with `void 0`. Resolve createRequire via a computed
 * property so webpack cannot rewrite it, then load the CJS helper from disk.
 */
export function getRemotionWritableDir(): string {
  return path.join(os.tmpdir(), 'remotion')
}

function loadDownloadsCacheModule(): { getDownloadsCacheDir: () => string } {
  const destPath = path.join(
    process.cwd(),
    'node_modules',
    '@remotion',
    'renderer',
    'dist',
    'browser',
    'get-download-destination.js'
  )
  const createReq = NodeModule[
    `create${'Require'}` as keyof typeof NodeModule
  ] as typeof NodeModule.createRequire
  const nodeRequire = createReq(path.join(process.cwd(), 'package.json'))
  return nodeRequire(destPath) as { getDownloadsCacheDir: () => string }
}

export function applyRemotionWritableCacheDir(): string {
  const dir = getRemotionWritableDir()
  fs.mkdirSync(dir, { recursive: true })
  const dest = loadDownloadsCacheModule()
  dest.getDownloadsCacheDir = () => dir
  return dir
}

applyRemotionWritableCacheDir()
