'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderKanban, Image as ImageIcon, Sparkles, Film, Settings, X, Zap, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useUsage } from '@/lib/usage'

// Phase — AI-first simplification. Mugtee is a faceless AI Studio, not a production tracker.
// Crew / Shoots / Calendar / Analytics / Automations routes still exist and remain functional,
// they are just hidden from the sidebar to reduce cognitive load. Reachable via direct URL.
const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/pipeline',   label: 'Projects',   icon: FolderKanban },
  { href: '/media',      label: 'Library',    icon: ImageIcon },
  { href: '/settings',   label: 'Settings',   icon: Settings },
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
            <div className="font-display text-lg leading-none truncate">{workspace.name || 'Mugtee AI Studio'}</div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-gold-400/80 mt-1">Mugtee AI</div>
          </div>
        </Link>
        {showClose && (<button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" /></button>)}
      </div>

      {/* Phase V1.1 — Plan pill: trial countdown · paid badge · or free credits remaining */}
      <PlanPill />

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
        <p className="text-xs text-luxe/70 leading-relaxed mb-3">Unlock unlimited AI generations, longform scripts, and priority cinematic rendering.</p>
        <Link href="/pricing" onClick={onItemClick} className="block w-full text-center text-xs font-medium py-2 rounded-lg bg-gold-gradient text-black hover:opacity-90 transition cursor-pointer relative z-30">Upgrade</Link>
      </div>
    </div>
  )
}

// ─── PlanPill ────────────────────────────────────────────────────
// Compact trial-countdown / credits pill above the navigation.
// PRO_TRIAL active  → "✨ PRO TRIAL · Nd Left" gold (becomes amber under 2 days)
// Paid              → "👑 PRO" gold
// Free              → "⚡ N credits left" muted
function PlanPill() {
  const { trial, isUnlimited, plan, remaining } = useUsage()
  const days = trial.daysLeft
  if (isUnlimited && trial.active) {
    const urgent = days <= 2
    return (
      <div className={cn(
        'mb-5 px-3 py-2 rounded-xl border flex items-center gap-2 text-[11px]',
        urgent
          ? 'bg-amber-500/12 border-amber-500/40 text-amber-200 shadow-[0_0_18px_-6px_rgba(245,158,11,0.6)]'
          : 'bg-gold-500/12 border-gold-500/40 text-gold-200 shadow-[0_0_18px_-6px_rgba(245,196,77,0.6)]',
      )}>
        <Sparkles className={cn('w-3.5 h-3.5', urgent ? 'text-amber-300' : 'text-gold-300')} />
        <div className="flex-1 min-w-0">
          <div className="font-medium tracking-wide leading-tight">FREE TRIAL</div>
          <div className={cn('text-[10px] leading-tight', urgent ? 'text-amber-300/80' : 'text-gold-300/80')}>
            {days} day{days === 1 ? '' : 's'} left · <span className="font-medium">∞ Unlimited</span>
          </div>
        </div>
      </div>
    )
  }
  if (plan === 'creator' || plan === 'agency') {
    return (
      <div className="mb-5 px-3 py-2 rounded-xl border bg-gold-500/15 border-gold-500/40 text-gold-200 flex items-center gap-2 text-[11px]">
        <Crown className="w-3.5 h-3.5 text-gold-300" />
        <div className="flex-1 min-w-0">
          <div className="font-medium tracking-wide leading-tight">{plan === 'agency' ? 'AGENCY' : 'CREATOR'}</div>
          <div className="text-[10px] text-gold-300/80 leading-tight">∞ Unlimited</div>
        </div>
      </div>
    )
  }
  return (
    <div className="mb-5 px-3 py-2 rounded-xl border bg-white/[0.03] border-white/[0.06] flex items-center gap-2 text-[11px]">
      <Zap className="w-3.5 h-3.5 text-gold-300" />
      <div className="flex-1 min-w-0">
        <div className="font-medium tracking-wide leading-tight text-luxe">FREE PLAN</div>
        <div className="text-[10px] text-muted-foreground leading-tight">
          {Number.isFinite(remaining.ai) ? `${remaining.ai} credit${remaining.ai === 1 ? '' : 's'} left` : '∞ Unlimited'}
        </div>
      </div>
    </div>
  )
}
