import 'server-only'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  compositorGlibcBundleDir,
  compositorGlibcRuntimeDir,
  REMOTION_GLIBC_LIBM,
} from '@/lib/remotion/serverless-compositor-glibc.core'

/**
 * Copy the build-bundled Ubuntu 2.35 glibc (not a runtime download) to
 * `/tmp/glibc235` so the patchelf'd compositor interpreter can start.
 */
export function ensureRemotionCompositorGlibc(): string | null {
  if (process.platform !== 'linux') return null

  const source = compositorGlibcBundleDir(process.cwd())
  const sourceLibm = path.join(source, 'lib', 'x86_64-linux-gnu', 'libm.so.6')
  if (!fs.existsSync(sourceLibm)) {
    if (process.env.VERCEL === '1') {
      console.error('[remotion-glibc] bundled Ubuntu 2.35 libm.so.6 missing', sourceLibm)
    }
    return null
  }

  const dest = compositorGlibcRuntimeDir(os.tmpdir())
  const destLibm = path.join(dest, 'lib', 'x86_64-linux-gnu', 'libm.so.6')
  if (!fs.existsSync(destLibm)) {
    fs.cpSync(source, dest, { recursive: true })
  }

  if (!fs.existsSync(REMOTION_GLIBC_LIBM)) {
    console.error('[remotion-glibc] runtime libm missing after copy', REMOTION_GLIBC_LIBM)
    return null
  }

  return dest
}

ensureRemotionCompositorGlibc()
