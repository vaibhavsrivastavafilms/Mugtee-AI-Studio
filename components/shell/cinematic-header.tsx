'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Plus, Search, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { quickCutStudioHref, STUDIO } from '@/lib/create/routes'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import { HEADER_NAV, headerNavActive } from '@/lib/shell/header-nav'
import {
  HeaderRightActions,
  HeaderSearchDropdown,
} from '@/components/shell/cinematic-header-app-actions'
import { Button } from '@/components/ui/button'
type User = { email?: string | null; user_metadata?: Record<string, unknown> }

export function CinematicHeader({
  user,
  variant = 'app',
}: {
  user?: User | null
  variant?: 'app' | 'portal'
}) {
  return (
    <Suspense fallback={<CinematicHeaderFallback variant={variant} />}>
      <CinematicHeaderInner user={user} variant={variant} />
    </Suspense>
  )
}

function CinematicHeaderFallback({ variant }: { variant: 'app' | 'portal' }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gold-soft/60 bg-[#050505]/80 backdrop-blur-xl">
      <div className="h-14 sm:h-16 px-3 sm:px-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gold-gradient/40 animate-pulse" />
        {variant === 'app' ? (
          <div className="flex-1 h-10 rounded-xl bg-white/[0.04] animate-pulse" />
        ) : null}
      </div>
    </header>
  )
}

function CinematicHeaderInner({
  user,
  variant,
}: {
  user?: User | null
  variant: 'app' | 'portal'
}) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const tab = searchParams?.get('tab') ?? null
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const isApp = variant === 'app' && !!user

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/75 backdrop-blur-2xl">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/35 to-transparent"
        aria-hidden
      />

      <div className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-5 lg:px-6 h-14 sm:h-16">
        <Link href={isApp ? STUDIO.create + '?mode=quick' : '/'} className="group flex items-center gap-2.5 shrink-0 min-w-0">
          <motion.div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold-glow shrink-0"
            animate={{
              boxShadow: [
                '0 0 20px rgba(212,175,55,0.25)',
                '0 0 32px rgba(212,175,55,0.45)',
                '0 0 20px rgba(212,175,55,0.25)',
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="font-display text-sm sm:text-base font-bold text-black">M</span>
          </motion.div>
          <div className="hidden sm:block min-w-0">
            <div className="font-display text-sm sm:text-base leading-none text-gold-gradient truncate">
              Mugtee
            </div>
            {isApp ? (
              <div className="text-[9px] tracking-[0.28em] uppercase text-gold-400/55 mt-0.5">
                Studio
              </div>
            ) : (
              <div className="text-[9px] tracking-[0.28em] uppercase text-gold-400/70 mt-0.5">
                Cinematic reels
              </div>
            )}
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5 ml-2 xl:ml-6">
          {HEADER_NAV.map((item) => {
            const active = headerNavActive(item.id, pathname, tab)
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  if (item.id === 'create') resetQuickCutForFreshCreate()
                }}
                className={cn(
                  'relative px-3.5 py-2 text-sm font-medium tracking-wide transition-colors rounded-lg',
                  active ? 'text-gold-200' : 'text-muted-foreground hover:text-luxe'
                )}
              >
                {item.label}
                {active ? (
                  <motion.span
                    layoutId="headerNavUnderline"
                    className="absolute left-2 right-2 -bottom-0.5 h-[2px] rounded-full bg-gold-gradient shadow-gold-glow"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div
          ref={searchRef}
          className={cn(
            'relative flex-1 min-w-0 mx-1 sm:mx-2',
            variant === 'portal' && 'max-w-md ml-auto'
          )}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400/50 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (isApp) setSearchOpen(true)
            }}
            onFocus={() => isApp && setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('')
                setSearchOpen(false)
              }
            }}
            placeholder="Search projects, scripts, storyboards..."
            className={cn(
              'w-full h-9 sm:h-10 pl-10 pr-3 rounded-xl text-sm transition-all',
              'bg-gradient-to-r from-black/60 via-zinc-950/80 to-black/60',
              'border border-white/[0.08] text-luxe placeholder:text-muted-foreground/70',
              'focus:outline-none focus:border-gold-500/45 focus:shadow-[0_0_24px_-6px_rgba(212,175,55,0.35)]'
            )}
          />
          {isApp && user ? (
            <HeaderSearchDropdown
              query={query}
              searchOpen={searchOpen}
              setSearchOpen={setSearchOpen}
              setQuery={setQuery}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isApp && user ? (
            <HeaderRightActions user={user} />
          ) : (
            <>
              <Button
                size="sm"
                asChild
                className="hidden sm:inline-flex h-9 gap-1.5 rounded-full bg-gold-gradient text-black hover:opacity-90 font-medium shadow-gold-glow"
              >
                <Link href={quickCutStudioHref()}>
                  <Plus className="w-4 h-4" /> New Project
                </Link>
              </Button>
              <Link
                href="/auth"
                className="text-xs sm:text-sm text-muted-foreground hover:text-gold-200 transition px-2 py-1.5"
              >
                Sign in
              </Link>
              <Button size="sm" asChild className="h-9 rounded-full bg-gold-gradient text-black">
                <Link href={STUDIO.root}>Open Studio</Link>
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            aria-label="Navigation"
          >
            {mobileNavOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileNavOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden border-t border-white/[0.06] bg-black/40"
          >
            <nav className="flex gap-1 overflow-x-auto scroll-touch px-3 py-2.5">
              {HEADER_NAV.map((item) => {
                const active = headerNavActive(item.id, pathname, tab)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      setMobileNavOpen(false)
                      if (item.id === 'create') resetQuickCutForFreshCreate()
                    }}
                    className={cn(
                      'shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-all',
                      active
                        ? 'bg-gold-500/15 text-gold-200 border border-gold-500/35'
                        : 'text-muted-foreground border border-transparent hover:bg-white/[0.04]'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
