import type { NextRequest } from 'next/server'

/** Map legacy creator paths to canonical /studio/* routes (pathname only). */
export function legacyStudioPathname(pathname: string): string | null {
  if (pathname === '/create') return '/studio/create'
  if (pathname.startsWith('/create/')) {
    return pathname.replace(/^\/create/, '/studio/create')
  }
  if (pathname === '/projects') return '/studio/projects'
  if (pathname === '/settings') return '/studio/settings'
  if (pathname === '/workspace') return '/studio/director'
  if (pathname === '/dashboard') return '/studio/create'
  if (pathname === '/studio/quick-cut' || pathname.startsWith('/studio/quick-cut/')) {
    return '/studio/create'
  }
  return null
}

export function cloneWithPathname(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return url
}
