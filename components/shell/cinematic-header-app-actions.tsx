'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Sparkles,
  Users2,
  Zap,
} from 'lucide-react'
import { NotificationPanel } from '@/components/shell/notification-panel'
import { cn } from '@/lib/utils'
import { CreateNewProjectButton } from '@/components/retention/create-new-project-button'
import { useStore } from '@/lib/store'
import { useUsage } from '@/lib/usage'
import { useAutomations } from '@/lib/automations-store'
import { WatchAdBanner } from '@/components/usage/watch-ad-banner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { PLATFORM_META } from '@/lib/dummy-data'
import { formatDistanceToNow, parseISO } from 'date-fns'

type User = { email?: string | null; user_metadata?: Record<string, unknown> }

export function HeaderSearchDropdown({
  query,
  searchOpen,
  setSearchOpen,
  setQuery,
}: {
  query: string
  searchOpen: boolean
  setSearchOpen: (v: boolean) => void
  setQuery: (v: string) => void
}) {
  const router = useRouter()
  const { content, crew, shoots, media } = useStore()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const m = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q)
    return {
      content: content
        .filter(
          (c) =>
            m(c.title) ||
            m(c.description) ||
            m(c.platform) ||
            m(PLATFORM_META[c.platform]?.label)
        )
        .slice(0, 5),
      crew: crew.filter((c) => m(c.name) || m(c.role) || m(c.email)).slice(0, 5),
      shoots: shoots.filter((s) => m(s.title) || m(s.location) || m(s.notes)).slice(0, 5),
      media: media.filter((md) => m(md.title) || m(md.type)).slice(0, 5),
    }
  }, [query, content, crew, shoots, media])

  const totalResults = results
    ? results.content.length +
      results.crew.length +
      results.shoots.length +
      results.media.length
    : 0

  const goto = (path: string) => {
    setQuery('')
    setSearchOpen(false)
    router.push(path)
  }

  return (
    <AnimatePresence>
      {searchOpen && query ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl p-2 z-50 max-h-[50vh] overflow-y-auto scrollbar-luxe shadow-cinema"
        >
          {totalResults === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {results!.content.length > 0 && (
                <SearchGroup label="Content" icon={Film}>
                  {results!.content.map((c) => (
                    <SearchRow
                      key={c.id}
                      title={c.title}
                      sub={`${PLATFORM_META[c.platform]?.label || c.platform} · ${c.status}`}
                      onClick={() => goto(`/pipeline?status=${c.status}`)}
                    />
                  ))}
                </SearchGroup>
              )}
              {results!.crew.length > 0 && (
                <SearchGroup label="Crew" icon={Users2}>
                  {results!.crew.map((c) => (
                    <SearchRow
                      key={c.id}
                      title={c.name}
                      sub={c.role || ''}
                      onClick={() => goto('/crew')}
                    />
                  ))}
                </SearchGroup>
              )}
              {results!.shoots.length > 0 && (
                <SearchGroup label="Shoots" icon={Clapperboard}>
                  {results!.shoots.map((s) => (
                    <SearchRow
                      key={s.id}
                      title={s.title}
                      sub={[s.date, s.location].filter(Boolean).join(' · ')}
                      onClick={() => goto('/shoots')}
                    />
                  ))}
                </SearchGroup>
              )}
              {results!.media.length > 0 && (
                <SearchGroup label="Media" icon={ImageIcon}>
                  {results!.media.map((m) => (
                    <SearchRow
                      key={m.id}
                      title={m.title}
                      sub={m.type || ''}
                      onClick={() => goto('/media')}
                    />
                  ))}
                </SearchGroup>
              )}
            </>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function HeaderRightActions({ user }: { user: User }) {
  const router = useRouter()
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAsRead, markAllRead, deleteNotification } =
    useAutomations()
  const { remaining, isUnlimited } = useUsage()

  const name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split('@')[0] ||
    'Creator'
  const avatar =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string)
  const initials = name
    .split(' ')
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const creditsLabel = isUnlimited
    ? '\u221E Unlimited'
    : `${Number.isFinite(remaining.ai) ? remaining.ai : '\u2014'} credits`
  const creditsLow =
    !isUnlimited && Number.isFinite(remaining.ai) && (remaining.ai as number) <= 5

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined' || !bellOpen) return
    if (window.matchMedia('(max-width: 1023px)').matches) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [bellOpen])

  const onNotifClick = (n: { id: string; read: boolean; link?: string | null }) => {
    if (!n.read) markAsRead(n.id)
    if (n.link) {
      setBellOpen(false)
      router.push(n.link)
    }
  }

  return (
    <>
      <CreateNewProjectButton />

      <div ref={bellRef} className="relative hidden sm:block">
        <button
          type="button"
          onClick={() => setBellOpen((v) => !v)}
          aria-label="Notifications"
          className="relative p-2.5 rounded-xl hover:bg-white/5 transition min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-gradient text-black text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>
        <NotificationPanel
          open={bellOpen}
          onClose={() => setBellOpen(false)}
          anchorRef={bellRef}
          notifications={notifications}
          unreadCount={unreadCount}
          markAllRead={markAllRead}
          deleteNotification={deleteNotification}
          onNotifClick={onNotifClick}
        />
      </div>

      <WatchAdBanner compact />

      <button
        type="button"
        onClick={() => router.push('/pricing')}
        aria-label={isUnlimited ? 'Unlimited plan' : `${creditsLabel} remaining`}
        title={isUnlimited ? 'Unlimited plan' : `${creditsLabel} left`}
        className={cn(
          'hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-[11px] tracking-wide',
          isUnlimited
            ? 'bg-gold-500/10 border-gold-500/30 text-gold-200'
            : creditsLow
              ? 'bg-amber-500/12 border-amber-500/40 text-amber-200'
              : 'bg-white/[0.04] border-white/[0.08] text-luxe/85 hover:border-gold-500/40'
        )}
      >
        {isUnlimited ? (
          <Sparkles className="w-3.5 h-3.5 text-gold-300" />
        ) : (
          <Zap className={cn('w-3.5 h-3.5', creditsLow ? 'text-amber-300' : 'text-gold-400/80')} />
        )}
        <span className="font-medium">{creditsLabel}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account"
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-white/5 min-h-[44px]"
          >
            <Avatar className="w-8 h-8 ring-2 ring-gold-500/40">
              {avatar ? <AvatarImage src={avatar} /> : null}
              <AvatarFallback className="bg-gold-gradient text-black text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 glass-strong">
          <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/settings')}>Studio Settings</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/pricing')} className="text-gold-300">
            <Zap className="w-3.5 h-3.5 mr-2" /> Recharge Credits
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/auth/signout" className="text-red-300">
              Sign out
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

function SearchGroup({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: typeof Film
  children: React.ReactNode
}) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-[0.25em] uppercase text-gold-400/80">
        <Icon className="w-3 h-3" /> {label}
      </div>
      {children}
    </div>
  )
}

function SearchRow({
  title,
  sub,
  onClick,
}: {
  title: string
  sub?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition group"
    >
      <div className="text-sm font-medium truncate group-hover:text-gold-200">{title}</div>
      {sub ? <div className="text-[11px] text-muted-foreground truncate">{sub}</div> : null}
    </button>
  )
}
