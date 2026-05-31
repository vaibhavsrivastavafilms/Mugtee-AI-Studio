'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  FolderOpen,
  BookOpen,
  Upload,
  Target,
  LayoutGrid,
  Clapperboard,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDIO } from '@/lib/create/routes'

const OS_TILES = [
  { id: 'today', label: 'Today', href: STUDIO.root, icon: LayoutGrid },
  { id: 'projects', label: 'Projects', href: STUDIO.projects, icon: FolderOpen },
  { id: 'workspace', label: 'Workspace', href: STUDIO.create, icon: Clapperboard },
  { id: 'library', label: 'Library', href: STUDIO.knowledge, icon: BookOpen },
  { id: 'publish', label: 'Publish', href: STUDIO.exports, icon: Upload },
  { id: 'goals', label: 'Goals', href: `${STUDIO.settings}#creator-profile`, icon: Target },
  { id: 'settings', label: 'Settings', href: STUDIO.settings, icon: Settings },
  { id: 'calendar', label: 'Calendar', href: '/dashboard', icon: Calendar },
] as const

export function CreatorOsNav({ className }: { className?: string }) {
  const pathname = usePathname() ?? ''

  return (
    <nav
      className={cn('grid grid-cols-4 sm:grid-cols-8 gap-2', className)}
      aria-label="Creator OS"
    >
      {OS_TILES.map((tile) => {
        const active =
          pathname === tile.href ||
          (tile.href !== '/dashboard' && pathname.startsWith(tile.href.split('#')[0]))
        return (
          <Link
            key={tile.id}
            href={tile.href}
            className={cn(
              'group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition',
              active
                ? 'border-gold-500/35 bg-gold-500/[0.08]'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-gold-500/30 hover:bg-gold-500/[0.04]'
            )}
          >
            <tile.icon
              className={cn(
                'w-4 h-4 transition',
                active ? 'text-gold-200' : 'text-gold-300/70 group-hover:text-gold-200'
              )}
            />
            <span
              className={cn(
                'text-[9px] tracking-[0.16em] uppercase',
                active ? 'text-luxe/85' : 'text-luxe/55 group-hover:text-luxe/80'
              )}
            >
              {tile.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
