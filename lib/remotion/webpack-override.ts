import path from 'path'
import type { WebpackOverrideFn } from '@remotion/bundler'

/**
 * Remotion's bundler does not read tsconfig paths.
 * This repo maps `@/lib/*` → `./lib/*`. Never alias `@` to `src`
 * (`@/lib/motion/transition-timing` would otherwise resolve to `src/lib/...`).
 */
export const remotionWebpackOverride: WebpackOverrideFn = (config) => {
  const root = process.cwd()
  const existing =
    typeof config.resolve?.alias === 'object' && !Array.isArray(config.resolve.alias)
      ? config.resolve.alias
      : {}

  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...existing,
        '@/lib': path.resolve(root, 'lib'),
        '@/components': path.resolve(root, 'components'),
        '@/app': path.resolve(root, 'app'),
        '@/stores': path.resolve(root, 'stores'),
        '@/hooks': path.resolve(root, 'hooks'),
        '@/types': path.resolve(root, 'types'),
        '@/agents': path.resolve(root, 'agents'),
        '@/features': path.resolve(root, 'features'),
        '@': root,
      },
    },
  }
}
