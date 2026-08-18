import path from 'node:path'

/**
 * Remotion 4.0.490 `@remotion/compositor-linux-x64-gnu` `remotion` ELF requires
 * GLIBC_2.35. Vercel serverless (Amazon Linux 2023) provides glibc 2.34.
 *
 * Remotion's supported fix (packages/vercel patch-compositor) is Ubuntu 22.04
 * libc6 2.35 + patchelf. Interpreter/rpath point at `/tmp/glibc235`.
 */
export const REMOTION_GLIBC_RUNTIME_NAME = 'glibc235'
export const REMOTION_GLIBC_INTERPRETER = `/tmp/${REMOTION_GLIBC_RUNTIME_NAME}/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2`
export const REMOTION_GLIBC_LIB_DIR = `/tmp/${REMOTION_GLIBC_RUNTIME_NAME}/lib/x86_64-linux-gnu`
export const REMOTION_GLIBC_LIBM = `${REMOTION_GLIBC_LIB_DIR}/libm.so.6`

export const COMPOSITOR_LINUX_GNU_DIR = path.join(
  'node_modules',
  '@remotion',
  'compositor-linux-x64-gnu'
)

export function compositorGlibcBundleDir(cwd: string): string {
  return path.join(cwd, COMPOSITOR_LINUX_GNU_DIR, REMOTION_GLIBC_RUNTIME_NAME)
}

export function compositorGlibcRuntimeDir(tmpdir: string): string {
  return path.join(tmpdir, REMOTION_GLIBC_RUNTIME_NAME)
}
