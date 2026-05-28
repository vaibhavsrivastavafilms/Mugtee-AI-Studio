export type HeaderNavId = 'create' | 'projects' | 'settings'

export const HEADER_NAV = [
  { id: 'create' as const, label: 'Create', href: '/create' },
  { id: 'projects' as const, label: 'Projects', href: '/create?tab=projects' },
  { id: 'settings' as const, label: 'Settings', href: '/settings' },
]

export function headerNavActive(
  id: HeaderNavId,
  pathname: string,
  tab: string | null
): boolean {
  if (id === 'settings') return pathname.startsWith('/settings')
  if (id === 'projects') {
    return tab === 'projects' || tab === 'exports' || /^\/create\/[^/]+/.test(pathname)
  }
  if (id === 'create') {
    if (pathname === '/dashboard') return true
    if (!pathname.startsWith('/create')) return false
    if (tab === 'projects' || tab === 'exports') return false
    return true
  }
  return false
}
