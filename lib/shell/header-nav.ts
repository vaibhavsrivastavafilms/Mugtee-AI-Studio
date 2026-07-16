import { COMPANION_NAV_LABELS } from '@/lib/brand/mugtee-v2'

export type HeaderNavId =
  | 'home'
  | 'create'
  | 'video'
  | 'projects'
  | 'assets'
  | 'knowledge'
  | 'analytics'
  | 'director'
  | 'exports'
  | 'settings'

export const COMPANION_HEADER_NAV_ITEM = {
  id: 'home' as const,
  label: COMPANION_NAV_LABELS.home,
  href: '/home',
}

export const HEADER_NAV = [
  COMPANION_HEADER_NAV_ITEM,
  { id: 'create' as const, label: COMPANION_NAV_LABELS.create, href: '/studio/quick' },
  { id: 'projects' as const, label: COMPANION_NAV_LABELS.projects, href: '/studio/projects' },
  { id: 'assets' as const, label: COMPANION_NAV_LABELS.assets, href: '/studio/assets' },
  { id: 'knowledge' as const, label: COMPANION_NAV_LABELS.knowledge, href: '/studio/knowledge' },
  { id: 'analytics' as const, label: COMPANION_NAV_LABELS.analytics, href: '/studio/analytics' },
  { id: 'director' as const, label: COMPANION_NAV_LABELS.director, href: '/studio/director' },
  { id: 'exports' as const, label: COMPANION_NAV_LABELS.exports, href: '/studio/exports' },
  { id: 'video' as const, label: COMPANION_NAV_LABELS.video, href: '/studio/video' },
  { id: 'settings' as const, label: COMPANION_NAV_LABELS.settings, href: '/studio/settings' },
]

export function headerNavForCompanionAccess(showCompanion: boolean) {
  if (showCompanion) return HEADER_NAV
  return HEADER_NAV.filter((item) => item.id !== 'home')
}

export function headerNavActive(
  id: HeaderNavId,
  pathname: string,
  tab: string | null
): boolean {
  if (id === 'home') {
    return pathname === '/home' || pathname.startsWith('/home/')
  }
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
    return (
      pathname.startsWith('/studio/director') ||
      pathname.startsWith('/studio/workspace')
    )
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
  if (id === 'assets') {
    return pathname.startsWith('/studio/assets') || pathname.startsWith('/studio/library')
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
    if (pathname === '/studio/quick' || pathname.startsWith('/studio/quick/')) return true
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
