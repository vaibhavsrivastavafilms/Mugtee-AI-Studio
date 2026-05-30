'use client'

import { usePathname } from 'next/navigation'
import { STUDIO_TAGLINE } from '@/lib/shell/studio-constants'

/** Quiet studio prompt — Final Cut Pro feel, no marketing sections. */
export function StudioPromptBar() {
  const pathname = usePathname() ?? ''
  const inStudio =
    pathname.startsWith('/studio') ||
    pathname.startsWith('/create') ||
    pathname.startsWith('/workspace') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/settings')

  if (!inStudio) return null

  // Creator workspace has its own daily prompt headline.
  if (pathname === '/studio' || pathname === '/studio/') return null

  return (
    <div className="border-b border-white/[0.04] bg-black/20">
      <div className="px-3 sm:px-5 lg:px-6 py-3">
        <p className="font-display text-base sm:text-lg text-luxe/90 tracking-tight">
          {STUDIO_TAGLINE}
        </p>
      </div>
    </div>
  )
}
