/** Legacy route redirects — V7 studio is the only product surface. */

const LEGACY_TO_STUDIO: Record<string, string> = {
  '/v3': '/studio',
  '/create': '/studio',
  '/dashboard': '/studio',
  '/quick-cut': '/studio',
  '/cinematic': '/studio',
  '/workspace': '/studio',
  '/pipeline': '/studio',
  '/library': '/studio',
  '/scripts': '/studio',
  '/storyboards': '/studio',
  '/director-cut': '/studio',
}

const LEGACY_PREFIX_REDIRECTS: Array<{ prefix: string; target: string }> = [
  { prefix: '/v3/', target: '/studio' },
  { prefix: '/quick-cut/', target: '/studio' },
  { prefix: '/cinematic/', target: '/studio' },
  { prefix: '/create/', target: '/studio' },
  { prefix: '/studio/quick-cut', target: '/studio' },
  { prefix: '/studio/quick', target: '/studio' },
  { prefix: '/studio/(shell)', target: '/studio' },
]

export function v7LegacyRedirectPath(pathname: string): string | null {
  if (LEGACY_TO_STUDIO[pathname]) return LEGACY_TO_STUDIO[pathname]

  for (const { prefix, target } of LEGACY_PREFIX_REDIRECTS) {
    if (pathname === prefix || pathname.startsWith(prefix)) return target
  }

  return null
}
