export type HeaderNavId =
  | 'create'
  | 'video'
  | 'projects'
  | 'knowledge'
  | 'director'
  | 'exports'
  | 'settings'

export const HEADER_NAV = [
  { id: 'create' as const, label: 'Create', href: '/studio/create?mode=quick' },
  { id: 'video' as const, label: 'Text To Video', href: '/studio/video' },
  { id: 'projects' as const, label: 'Projects', href: '/studio/projects' },
  { id: 'knowledge' as const, label: 'Knowledge', href: '/studio/knowledge' },
  { id: 'director' as const, label: 'Director Mode', href: '/studio/director' },
  { id: 'exports' as const, label: 'Exports', href: '/studio/exports' },
  { id: 'settings' as const, label: 'Settings', href: '/studio/settings' },
]

export function headerNavActive(
  id: HeaderNavId,
  pathname: string,
  tab: string | null
): boolean {
  if (id === 'video') {
    return pathname.startsWith('/studio/video')
  }
  if (id === 'settings') {
    return pathname.startsWith('/studio/settings') || pathname.startsWith('/settings')
  }
  if (id === 'exports') {
    return pathname.startsWith('/studio/exports') || tab === 'exports'
  }
  if (id === 'director') {
    return pathname.startsWith('/studio/director') || pathname.startsWith('/workspace')
  }
  if (id === 'knowledge') {
    return (
      pathname.startsWith('/studio/knowledge') ||
      tab === 'knowledge' ||
      pathname.startsWith('/create/knowledge')
    )
  }
  if (id === 'analytics') {
    return pathname.startsWith('/studio/analytics') || tab === 'analytics'
  }
  if (id === 'projects') {
    return (
      pathname.startsWith('/studio/projects') ||
      pathname.startsWith('/studio/project/') ||
      pathname.startsWith('/projects') ||
      tab === 'projects' ||
      /^\/studio\/create\/[^/]+/.test(pathname) ||
      /^\/create\/[^/]+/.test(pathname) ||
      /^\/project\//.test(pathname)
    )
  }
  if (id === 'create') {
    if (pathname === '/studio' || pathname.startsWith('/studio/create')) {
      if (tab === 'projects' || tab === 'exports' || tab === 'knowledge' || tab === 'analytics') return false
      return true
    }
    if (
      pathname.startsWith('/create') &&
      tab !== 'projects' &&
      tab !== 'exports' &&
      tab !== 'knowledge' &&
      tab !== 'analytics'
    ) {
      return true
    }
    return false
  }
  return false
}
