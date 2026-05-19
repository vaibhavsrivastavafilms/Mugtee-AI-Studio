'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CalendarRange, Kanban, Users2, Clapperboard,
  Image as ImageIcon, BarChart3, X, Sparkles, Film, Settings, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/calendar',   label: 'Content Calendar',  icon: CalendarRange },
  { href: '/pipeline',   label: 'Kanban Pipeline',   icon: Kanban },
  { href: '/crew',       label: 'Crew',              icon: Users2 },
  { href: '/shoots',     label: 'Shoots',            icon: Clapperboard },
  { href: '/media',      label: 'Media Library',     icon: ImageIcon },
  { href: '/analytics',  label: 'Analytics',         icon: BarChart3 },
  { href: '/automations',label: 'Automations',       icon: Zap },
  { href: '/settings',   label: 'Settings',          icon: Settings },
]

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()
  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
            <motion.aside initial={{x:-300}} animate={{x:0}} exit={{x:-300}} transition={{type:'spring', damping:24}}
              className="fixed top-0 left-0 bottom-0 w-72 z-50 lg:hidden">
              <SidebarInner pathname={pathname} onItemClick={onClose} showClose onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <aside className="hidden lg:flex w-72 shrink-0 sticky top-0 h-screen">
        <SidebarInner pathname={pathname} />
      </aside>
    </>
  )
}

function SidebarInner({ pathname, onItemClick, showClose, onClose }: { pathname: string; onItemClick?: () => void; showClose?: boolean; onClose?: () => void }) {
  const { workspace } = useStore()
  return (
    <div className="flex flex-col w-full h-full glass border-r border-gold-soft px-5 py-7">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold-glow overflow-hidden shrink-0">
            {workspace.logo_url ? <img src={workspace.logo_url} alt="logo" className="w-full h-full object-cover" /> : <Film className="w-5 h-5 text-black" />}
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg leading-none truncate">{workspace.name || 'My Studio'}</div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-gold-400/80 mt-1">ViralForge AI</div>
          </div>
        </Link>
        {showClose && (<button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" /></button>)}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-luxe">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={onItemClick}
              className={cn('group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all',
                active ? 'text-foreground bg-gradient-to-r from-gold-500/15 to-transparent border border-gold-500/30 shadow-inner-gold'
                       : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]')}
            >
              {active && <motion.div layoutId="activeNav" className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gold-gradient shadow-gold-glow" />}
              <Icon className={cn('w-4 h-4', active ? 'text-gold-400' : 'text-muted-foreground group-hover:text-gold-300')} />
              <span className="font-medium tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 p-4 rounded-xl glass-gold relative z-20">
        <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-gold-300" /><span className="font-display text-sm">Studio Pro</span></div>
        <p className="text-xs text-luxe/70 leading-relaxed mb-3">Unlock unlimited shoots, realtime crew sync & priority rendering.</p>
        <Link href="/pricing" onClick={onItemClick} className="block w-full text-center text-xs font-medium py-2 rounded-lg bg-gold-gradient text-black hover:opacity-90 transition cursor-pointer relative z-30">Upgrade</Link>
      </div>
    </div>
  )
}
