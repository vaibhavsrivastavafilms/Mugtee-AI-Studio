'use client'

import Link from 'next/link'
import {
  Calendar,
  FolderOpen,
  BookOpen,
  Upload,
  Target,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDIO } from '@/lib/create/routes'

const OS_TILES = [
  { id: 'today', label: 'Today', href: STUDIO.root, icon: LayoutGrid },
  { id: 'projects', label: 'Projects', href: STUDIO.projects, icon: FolderOpen },
  { id: 'library', label: 'Library', href: STUDIO.knowledge, icon: BookOpen },
  { id: 'publish', label: 'Publish', href: STUDIO.exports, icon: Upload },
  { id: 'goals', label: 'Goals', href: `${STUDIO.settings}#creator-profile`, icon: Target },
  { id: 'calendar', label: 'Calendar', href: '/dashboard', icon: Calendar },
] as const

export function CreatorOsNav({ className }: { className?: string }) {
  return (
    <nav className={cn('grid grid-cols-3 sm:grid-cols-6 gap-2', className)} aria-label="Creator OS">
      {OS_TILES.map((tile) => (
        <Link
          key={tile.id}
          href={tile.href}
          className={cn(
            'group flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06]',
            'bg-white/[0.02] px-2 py-3 hover:border-gold-500/30 hover:bg-gold-500/[0.04] transition'
          )}
        >
          <tile.icon className="w-4 h-4 text-gold-300/70 group-hover:text-gold-200 transition" />
          <span className="text-[9px] tracking-[0.16em] uppercase text-luxe/55 group-hover:text-luxe/80">
            {tile.label}
          </span>
        </Link>
      ))}
    </nav>
  )
}
