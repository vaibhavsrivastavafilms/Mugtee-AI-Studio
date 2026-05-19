'use client'
import { Menu, Search, Bell, Plus, Film, Users2, Clapperboard, Image as ImageIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PLATFORM_META } from '@/lib/dummy-data'

export function Topbar({ user, onMenu }: { user: { email?: string | null; user_metadata?: any }; onMenu: () => void }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Producer'
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture
  const initials = (name as string).split(' ').map((p: string) => p[0]).slice(0,2).join('').toUpperCase()

  const { content, crew, shoots, media } = useStore()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

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

  const goto = (path: string) => {
    setQuery('')
    setOpen(false)
    router.push(path)
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-gold-soft">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
        <button onClick={onMenu} className="lg:hidden p-2 rounded-lg hover:bg-white/5">
          <Menu className="w-5 h-5" />
        </button>

        <div ref={wrapRef} className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); setOpen(false) } }}
            placeholder="Search content, crew, shoots, media…"
            className="pl-10 h-10 bg-white/[0.03] border-white/[0.06] focus-visible:ring-gold-500/40 focus-visible:border-gold-500/40"
          />

          <AnimatePresence>
            {open && query && (
              <motion.div
                initial={{opacity:0, y:-4}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-4}}
                className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl p-2 z-50 max-h-[60vh] overflow-y-auto scrollbar-luxe shadow-cinema"
              >
                {totalResults === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No results for "<span className="text-luxe">{query}</span>"
                  </div>
                ) : (
                  <>
                    {results!.content.length > 0 && (
                      <ResultGroup label="Content" icon={Film}>
                        {results!.content.map(c => (
                          <ResultRow key={c.id} title={c.title} sub={`${PLATFORM_META[c.platform]?.label || c.platform} · ${c.status}`} onClick={() => goto(`/pipeline?status=${c.status}`)} />
                        ))}
                      </ResultGroup>
                    )}
                    {results!.crew.length > 0 && (
                      <ResultGroup label="Crew" icon={Users2}>
                        {results!.crew.map(c => (
                          <ResultRow key={c.id} title={c.name} sub={c.role || ''} onClick={() => goto('/crew')} />
                        ))}
                      </ResultGroup>
                    )}
                    {results!.shoots.length > 0 && (
                      <ResultGroup label="Shoots" icon={Clapperboard}>
                        {results!.shoots.map(s => (
                          <ResultRow key={s.id} title={s.title} sub={[s.date, s.location].filter(Boolean).join(' · ')} onClick={() => goto('/shoots')} />
                        ))}
                      </ResultGroup>
                    )}
                    {results!.media.length > 0 && (
                      <ResultGroup label="Media" icon={ImageIcon}>
                        {results!.media.map(m => (
                          <ResultRow key={m.id} title={m.title} sub={m.type || ''} onClick={() => goto('/media')} />
                        ))}
                      </ResultGroup>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => router.push('/pipeline')} className="hidden sm:inline-flex h-9 gap-2 bg-gold-gradient text-black hover:opacity-90 font-medium shadow-gold-glow">
            <Plus className="w-4 h-4" /> New Content
          </Button>

          <button className="relative p-2.5 rounded-xl hover:bg-white/5 transition">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse-gold" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-white/5 transition">
                <Avatar className="w-8 h-8 ring-2 ring-gold-500/40">
                  {avatar && <AvatarImage src={avatar} />}
                  <AvatarFallback className="bg-gold-gradient text-black text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium leading-tight">{name}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Showrunner</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-strong">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>Studio Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/auth/signout" className="text-red-300 focus:text-red-200">Sign out</a>
              </DropdownMenuItem>
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
      <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-[0.25em] uppercase text-gold-400/80">
        <Icon className="w-3 h-3" /> {label}
      </div>
      {children}
    </div>
  )
}

function ResultRow({ title, sub, onClick }: { title: string; sub?: string; onClick: () => void }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition group"
    >
      <div className="text-sm font-medium truncate group-hover:text-gold-200">{title}</div>
      {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
    </button>
  )
}
