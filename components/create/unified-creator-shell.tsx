'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Clapperboard,
  Download,
  Film,
  Mic,
  Sparkles,
  LayoutPanelTop,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDIO, type CreatorMode } from '@/lib/create/routes'

type NavItem = {
  id: string
  label: string
  icon: typeof Film
  href: string
}

function projectWorkflowNav(projectId: string, mode: CreatorMode): NavItem[] {
  const base = `${STUDIO.create}/${projectId}`
  if (mode === 'quick') {
    return [
      { id: 'generate', label: 'Generate', icon: Sparkles, href: `${base}/generate` },
      { id: 'preview', label: 'Preview', icon: LayoutPanelTop, href: `${base}/generate` },
      { id: 'export', label: 'Export', icon: Download, href: `${base}/export` },
    ]
  }

  return [
    { id: 'director', label: 'Direct', icon: Clapperboard, href: `${base}/director` },
    { id: 'scenes', label: 'Scenes', icon: Film, href: `${base}/director` },
    { id: 'voice', label: 'Voice', icon: Mic, href: `${base}/director` },
    { id: 'export', label: 'Export', icon: Download, href: `${base}/export` },
  ]
}

export function UnifiedCreatorShell({
  children,
  projectId = null,
  mode = 'director',
  title,
  subtitle,
}: {
  children: React.ReactNode
  projectId?: string | null
  mode?: CreatorMode
  title?: string
  subtitle?: string
}) {
  const pathname = usePathname() ?? ''
  const workflowNav = projectId ? projectWorkflowNav(projectId, mode) : null

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col max-w-[1600px] mx-auto w-full">
      {(title || subtitle || workflowNav) && (
        <div className="mb-5 sm:mb-6 space-y-4">
          {(title || subtitle) && (
            <div className="px-0.5">
              {title ? (
                <h1 className="font-display text-2xl sm:text-3xl text-luxe">{title}</h1>
              ) : null}
              {subtitle ? (
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
              ) : null}
            </div>
          )}
          {workflowNav ? (
            <nav className="flex gap-1 overflow-x-auto pb-1 scroll-touch scrollbar-luxe -mx-0.5 px-0.5">
              {workflowNav.map((item) => {
                const Icon = item.icon
                const active =
                  pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-full text-sm whitespace-nowrap transition-all shrink-0 border',
                      active
                        ? 'bg-gold-500/15 border-gold-500/35 text-gold-200 shadow-[0_0_20px_-8px_rgba(212,175,55,0.5)]'
                        : 'text-muted-foreground hover:text-luxe border-white/[0.06] hover:border-gold-500/20 hover:bg-white/[0.03]'
                    )}
                  >
                    <Icon
                      className={cn('w-4 h-4', active ? 'text-gold-300' : 'text-muted-foreground')}
                    />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          ) : null}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 gap-4 lg:gap-6 min-h-0">
        <main className="min-w-0 rounded-2xl border border-white/[0.06] bg-black/25 backdrop-blur-sm p-4 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          {children}
        </main>
      </div>
    </div>
  )
}
