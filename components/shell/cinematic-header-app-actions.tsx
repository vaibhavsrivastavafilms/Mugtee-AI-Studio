'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Check,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Users2,
  Zap,
} from 'lucide-react'
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

function NotificationPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  markAllRead,
  deleteNotification,
  onNotifClick,
}: {
  open: boolean
  onClose: () => void
  notifications: Array<{
    id: string
    title: string
    message?: string | null
    created_at: string
    read: boolean
    link?: string | null
  }>
  unreadCount: number
  markAllRead: () => void
  deleteNotification: (id: string) => void
  onNotifClick: (n: { id: string; read: boolean; link?: string | null }) => void
}) {
  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            key="notif-backdrop"
            type="button"
            aria-label="Close notifications"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[55] lg:hidden"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="notif-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'glass-strong shadow-cinema overflow-hidden flex flex-col',
              'fixed left-2 right-2 top-[68px] z-[60] rounded-2xl max-h-[80vh]',
              'lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[360px] lg:rounded-xl lg:z-50'
            )}
          >
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06] shrink-0">
              <div className="text-sm font-medium">Notifications</div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="text-[11px] text-gold-300 hover:text-gold-200 inline-flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gold-500/10"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              ) : null}
            </div>
            <div className="overflow-y-auto scrollbar-luxe flex-1 lg:max-h-[70vh]">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">All caught up.</div>
              ) : (
                notifications.slice(0, 30).map((n) => (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'flex items-start gap-2 px-3 py-2.5 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03]',
                      !n.read && 'bg-gold-500/[0.04]'
                    )}
                    onClick={() => onNotifClick(n)}
                    onKeyDown={(e) => e.key === 'Enter' && onNotifClick(n)}
                  >
                    <div
                      className={cn(
                        'mt-1 w-1.5 h-1.5 rounded-full shrink-0',
                        n.read ? 'bg-transparent' : 'bg-gold-400'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      {n.message ? (
                        <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(n.id)
                      }}
                      className="p-2 rounded hover:bg-white/5 text-muted-foreground hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
