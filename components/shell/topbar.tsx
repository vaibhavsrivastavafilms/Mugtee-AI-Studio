'use client'
import { Menu, Search, Bell, Plus, Film, Users2, Clapperboard, Image as ImageIcon, Check, X as XIcon, Trash2, Zap, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { useUsage } from '@/lib/usage'
import { useAutomations } from '@/lib/automations-store'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PLATFORM_META } from '@/lib/dummy-data'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

export function Topbar({ user, onMenu }: { user: { email?: string | null; user_metadata?: any }; onMenu: () => void }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Producer'
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
  const initials = (name as string).split(' ').map((p: string) => p[0]).slice(0,2).join('').toUpperCase()

  const { content, crew, shoots, media } = useStore()
  const { notifications, unreadCount, markAsRead, markAllRead, deleteNotification } = useAutomations()
  // V3.7 — Credits Remaining replaces the static "Showrunner" subtitle.
  const { remaining, isUnlimited, plan } = useUsage()
  const creditsLabel = isUnlimited
    ? '\u221E Unlimited'
    : `${Number.isFinite(remaining.ai) ? remaining.ai : '\u2014'} credits left`
  const creditsLow = !isUnlimited && Number.isFinite(remaining.ai) && (remaining.ai as number) <= 5
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Phase V1.2 mobile-fix — when the notification drawer is open on mobile, lock body scroll
  // so the underlying hero / FAB / quick actions can't be tap-targeted through the drawer.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (bellOpen) {
      const prev = document.body.style.overflow
      // Only lock on mobile widths — desktop dropdown doesn't need it.
      if (window.matchMedia('(max-width: 1023px)').matches) {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
      }
    }
  }, [bellOpen])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const m = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q)
    return {
      content: content.filter(c => m(c.title) || m(c.description) || m(c.platform) || m(PLATFORM_META[c.platform]?.label)).slice(0, 5),
      crew:    crew.filter(c    => m(c.name) || m(c.role) || m(c.email)).slice(0, 5),
      shoots:  shoots.filter(s  => m(s.title) || m(s.location) || m(s.notes)).slice(0, 5),
      media:   media.filter(md  => m(md.title) || m(md.type)).slice(0, 5),
    }
  }, [query, content, crew, shoots, media])

  const totalResults = results ? results.content.length + results.crew.length + results.shoots.length + results.media.length : 0

  const goto = (path: string) => { setQuery(''); setOpen(false); router.push(path) }

  const onNotifClick = (n: any) => {
    if (!n.read) markAsRead(n.id)
    if (n.link) { setBellOpen(false); router.push(n.link) }
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-gold-soft">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 lg:px-8 h-16">
        <button onClick={onMenu} aria-label="Open menu" className="lg:hidden p-2 rounded-lg hover:bg-white/5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"><Menu className="w-5 h-5" /></button>

        <div ref={wrapRef} className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); setOpen(false) } }}
            placeholder="Search content, crew, shoots, media…"
            className="pl-10 h-10 bg-white/[0.03] border-white/[0.06] focus-visible:ring-gold-500/40 focus-visible:border-gold-500/40" />
          <AnimatePresence>
            {open && query && (
              <motion.div initial={{opacity:0, y:-4}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-4}}
                className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl p-2 z-50 max-h-[60vh] overflow-y-auto scrollbar-luxe shadow-cinema"
              >
                {totalResults === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No results for "<span className="text-luxe">{query}</span>"</div>
                ) : (
                  <>
                    {results!.content.length > 0 && (
                      <ResultGroup label="Content" icon={Film}>
                        {results!.content.map(c => <ResultRow key={c.id} title={c.title} sub={`${PLATFORM_META[c.platform]?.label || c.platform} · ${c.status}`} onClick={() => goto(`/pipeline?status=${c.status}`)} />)}
                      </ResultGroup>
                    )}
                    {results!.crew.length > 0 && (
                      <ResultGroup label="Crew" icon={Users2}>{results!.crew.map(c => <ResultRow key={c.id} title={c.name} sub={c.role || ''} onClick={() => goto('/crew')} />)}</ResultGroup>
                    )}
                    {results!.shoots.length > 0 && (
                      <ResultGroup label="Shoots" icon={Clapperboard}>{results!.shoots.map(s => <ResultRow key={s.id} title={s.title} sub={[s.date, s.location].filter(Boolean).join(' · ')} onClick={() => goto('/shoots')} />)}</ResultGroup>
                    )}
                    {results!.media.length > 0 && (
                      <ResultGroup label="Media" icon={ImageIcon}>{results!.media.map(m => <ResultRow key={m.id} title={m.title} sub={m.type || ''} onClick={() => goto('/media')} />)}</ResultGroup>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => router.push('/pipeline')} className="hidden sm:inline-flex h-9 gap-2 bg-gold-gradient text-black hover:opacity-90 font-medium shadow-gold-glow" title="Start a new cinematic production">
            <Plus className="w-4 h-4" /> New Project
          </Button>

          {/* Notification bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen(v => !v)}
              aria-label={bellOpen ? 'Close notifications' : `Open notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              className="relative p-2.5 rounded-xl hover:bg-white/5 transition min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-gradient text-black text-[10px] font-bold flex items-center justify-center shadow-gold-glow">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Phase V1.2 mobile-fix — Backdrop (mobile only). Sits ABOVE hero/FAB/quick-actions (z-[55]) but BELOW the drawer (z-[60]). Tap to close. */}
            <AnimatePresence>
              {bellOpen && (
                <motion.button
                  key="notif-backdrop"
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setBellOpen(false)}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[55] lg:hidden"
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  key="notif-panel"
                  /* Mobile (<lg): fixed full-width drawer slides down from the top, contained inside viewport,
                     own scroll, 80vh cap, sits above backdrop. Desktop (lg+): original right-aligned dropdown. */
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={cn(
                    'glass-strong shadow-cinema overflow-hidden flex flex-col',
                    // Mobile: fixed full-width drawer pinned just under the topbar
                    'fixed left-2 right-2 top-[68px] z-[60] rounded-2xl max-h-[80vh]',
                    // Desktop: revert to anchored dropdown
                    'lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[360px] lg:max-w-[92vw] lg:rounded-xl lg:z-50',
                  )}
                >
                  <div className="flex items-center justify-between p-3 border-b border-white/[0.06] shrink-0">
                    <div className="text-sm font-medium">Notifications</div>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button onClick={() => markAllRead()} className="text-[11px] text-gold-300 hover:text-gold-200 inline-flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gold-500/10 min-h-[32px]">
                          <Check className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                      {/* Mobile-only close button — desktop closes via outside click */}
                      <button
                        onClick={() => setBellOpen(false)}
                        aria-label="Close"
                        className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/5 text-muted-foreground hover:text-luxe"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto scrollbar-luxe flex-1 lg:max-h-[70vh] overscroll-contain">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">All caught up.</div>
                    ) : notifications.slice(0, 30).map(n => (
                      <div key={n.id} className={cn('group flex items-start gap-2 px-3 py-3 sm:py-2.5 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.06] transition',
                        !n.read && 'bg-gold-500/[0.04]')}
                        onClick={() => onNotifClick(n)}
                      >
                        <div className={cn('mt-1 w-1.5 h-1.5 rounded-full shrink-0', n.read ? 'bg-transparent' : 'bg-gold-400 shadow-gold-glow')} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{n.title}</div>
                          {n.message && <div className="text-xs text-muted-foreground line-clamp-2 sm:truncate">{n.message}</div>}
                          <div className="text-[10px] text-muted-foreground/80 mt-0.5">{formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                          aria-label="Delete notification"
                          className="lg:opacity-0 lg:group-hover:opacity-100 p-2 rounded hover:bg-white/5 text-muted-foreground hover:text-red-300 min-w-[36px] min-h-[36px] inline-flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* V3.7 — Credits Remaining pill. Replaces static "Showrunner" subtitle, shows live
              credits + opens /pricing on click (Recharge entry point). Hidden when unlimited
              & on very narrow screens to keep the topbar uncluttered. */}
          <button
            onClick={() => router.push('/pricing')}
            title={isUnlimited ? 'Unlimited plan' : `${creditsLabel} \u00B7 Recharge from \u20B910`}
            className={cn(
              'hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border transition-colors text-[11px] tracking-wide whitespace-nowrap',
              isUnlimited
                ? 'bg-gold-500/10 border-gold-500/30 text-gold-200 hover:bg-gold-500/20'
                : creditsLow
                  ? 'bg-amber-500/12 border-amber-500/40 text-amber-200 hover:bg-amber-500/20 shadow-[0_0_18px_-6px_rgba(245,158,11,0.55)]'
                  : 'bg-white/[0.04] border-white/[0.08] hover:border-gold-500/40 text-luxe/85 hover:text-gold-200'
            )}
          >
            {isUnlimited ? <Sparkles className="w-3.5 h-3.5 text-gold-300" /> : <Zap className={cn('w-3.5 h-3.5', creditsLow ? 'text-amber-300' : 'text-gold-400/80')} />}
            <span className="font-medium">{creditsLabel}</span>
            {!isUnlimited && (
              <span className="ml-1 text-[10px] tracking-wider uppercase text-gold-300/85 hidden md:inline">{creditsLow ? 'Recharge' : '+ Recharge'}</span>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="Account menu" className="flex items-center gap-2.5 pl-1.5 pr-2 sm:pr-3 py-1.5 rounded-xl hover:bg-white/5 transition min-h-[44px]">
                <Avatar className="w-8 h-8 ring-2 ring-gold-500/40">
                  {avatar && <AvatarImage src={avatar} />}
                  <AvatarFallback className="bg-gold-gradient text-black text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium leading-tight">{name}</div>
                  {/* V3.7 — Plan label replaces static "Showrunner". */}
                  <div className="text-[10px] text-muted-foreground leading-tight capitalize">{isUnlimited ? (plan === 'agency' ? 'Agency' : plan === 'creator' ? 'Creator' : 'Free Trial') : 'Free Plan'}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-strong">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>Studio Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/automations')}>Automations</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/pricing')} className="text-gold-300 focus:text-gold-200">
                <Zap className="w-3.5 h-3.5 mr-2" /> Recharge Credits
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><a href="/auth/signout" className="text-red-300 focus:text-red-200">Sign out</a></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

function ResultGroup({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-[0.25em] uppercase text-gold-400/80"><Icon className="w-3 h-3" /> {label}</div>
      {children}
    </div>
  )
}

function ResultRow({ title, sub, onClick }: { title: string; sub?: string; onClick: () => void }) {
  return (
    <button onMouseDown={(e) => { e.preventDefault(); onClick() }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition group">
      <div className="text-sm font-medium truncate group-hover:text-gold-200">{title}</div>
      {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
    </button>
  )
}
