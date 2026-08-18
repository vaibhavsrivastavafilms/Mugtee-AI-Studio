import 'server-only'
import path from 'node:path'

import { remotionChromeModeForExecutable } from '@/lib/remotion/serverless-browser.core'

export { remotionChromeModeForExecutable }

/**
 * Remotion 4.0.490 default chromeMode is `headless-shell`.
 * Chrome Headless Shell is not an npm package — `@remotion/renderer` downloads it
 * at runtime into getDownloadsCacheDir() (`/tmp/remotion` after 4b79082).
 *
 * That binary launched on Vercel and exited 127. Remotion's documented cause
 * for this error is missing Linux shared libraries (nss, gbm, atk, …) which
 * Vercel serverless does not provide. Apt/yum is not available there.
 *
 * Remotion's supported SSR hook is `browserExecutable`.
 * `@sparticuz/chromium` ships Chromium + those libraries as packaged brotli
 * archives (extracted to os.tmpdir(), not downloaded from Chrome CDN).
 * Used only on Vercel Linux; local Windows keeps Remotion's own browser.
 */
export async function resolveRemotionBrowserExecutable(): Promise<string | null> {
  if (process.env.VERCEL !== '1' || process.platform !== 'linux') {
    return null
  }

  const chromium = (await import('@sparticuz/chromium')).default
  chromium.setGraphicsMode = false
  const executablePath = await chromium.executablePath()
  const libDir = path.dirname(executablePath)
  const existing = process.env.LD_LIBRARY_PATH?.trim()
  process.env.LD_LIBRARY_PATH = existing ? `${libDir}${path.delimiter}${existing}` : libDir
  return executablePath
}
