'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { cn } from '@/lib/utils'
import { buildSidekickRotation } from '@/lib/sidekick/sidekick-messages'
import {
  fetchCreatorMemoryProfile,
  type CreatorMemoryProfile,
} from '@/lib/creator/creator-memory'
import {
  resolveCreatorJourney,
  type CreatorJourneySnapshot,
} from '@/lib/sidekick/creator-journey'
import { STUDIO } from '@/lib/create/routes'

const LS_COLLAPSED = 'mugtee:sidekick:collapsed:v1'

function isSidekickRoute(pathname: string): boolean {
  if (pathname === '/dashboard') return true
  if (pathname === '/studio' || pathname.startsWith('/studio/')) return true
  if (pathname.startsWith('/projects')) return true
  if (pathname.startsWith('/create')) return true
  return false
}

function SidekickCard({
  journey,
  message,
  profileLoaded,
}: {
  journey: CreatorJourneySnapshot | null
  message: string
  profileLoaded: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <MugteeOrb state="idle" size={36} useLogo className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75 mb-1">
            Mugtee · Sidekick
          </p>
          <p className="text-sm text-luxe/90 leading-relaxed italic">&ldquo;{message}&rdquo;</p>
        </div>
      </div>

      {journey ? (
        <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] tracking-[0.2em] uppercase text-gold-300/80">
              Creator Journey
            </span>
            <span className="text-xs font-medium text-gold-200">{journey.label}</span>
          </div>
          <p className="text-[11px] text-luxe/55 mt-1 leading-snug">{journey.description}</p>
          <p className="text-[10px] text-luxe/40 mt-1.5">{journey.progressHint}</p>
        </div>
      ) : null}

      {!profileLoaded ? null : (
        <Link
          href={STUDIO.settings}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/60 hover:text-gold-200 transition"
        >
          <Sparkles className="w-3 h-3" />
          Tune my creator profile
        </Link>
      )}
    </div>
  )
}

export function MugteeSidekickPanel() {
  const pathname = usePathname() ?? ''
  const visible = isSidekickRoute(pathname)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const [profile, setProfile] = useState<CreatorMemoryProfile>({})
  const [journey, setJourney] = useState<CreatorJourneySnapshot | null>(null)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(LS_COLLAPSED) === '1')
    } catch {}
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 8000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const p = await fetchCreatorMemoryProfile()
      if (!alive) return
      setProfile(p)
      try {
        const res = await fetch('/api/usage', { cache: 'no-store' })
        if (res.ok) {
          const data = (await res.json()) as { used?: { projects?: number; generations?: number } }
          const projects = data.used?.projects ?? 0
          const generations = data.used?.generations ?? 0
          if (alive) setJourney(resolveCreatorJourney(projects, generations))
        }
      } catch {
        if (alive) setJourney(resolveCreatorJourney(0, 0))
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const message = useMemo(
    () => buildSidekickRotation(tick + (profile.creatorName?.length ?? 0)),
    [tick, profile.creatorName]
  )

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(LS_COLLAPSED, next ? '1' : '0')
      } catch {}
      return next
    })
  }

  if (!visible) return null

  const card = (
    <SidekickCard
      journey={journey}
      message={message}
      profileLoaded={Boolean(profile.creatorName || profile.niche)}
    />
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex shrink-0 flex-col w-[280px] xl:w-[300px] border-l border-white/[0.06] bg-black/25 backdrop-blur-xl',
          collapsed && 'lg:w-12 xl:w-12'
        )}
      >
        <div className="sticky top-16 flex flex-col max-h-[calc(100dvh-4rem)]">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/[0.04] text-[10px] tracking-[0.2em] uppercase text-luxe/50 hover:text-gold-200 transition"
            aria-label={collapsed ? 'Expand sidekick' : 'Collapse sidekick'}
          >
            {!collapsed ? <span>Mugtee</span> : null}
            {collapsed ? (
              <MugteeOrb state="idle" size={24} useLogo />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg]" />
            )}
          </button>
          {!collapsed ? (
            <div className="p-4 overflow-y-auto scrollbar-luxe flex-1">{card}</div>
          ) : null}
        </div>
      </aside>

      {/* Mobile bottom panel */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 pointer-events-none">
        <div className="pointer-events-auto mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className={cn(
              'w-full flex items-center justify-between gap-2 rounded-2xl border border-gold-500/25',
              'bg-[#0a0a0a]/95 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/50'
            )}
          >
            <span className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-gold-200">
              <MugteeOrb state="idle" size={22} useLogo />
              Mugtee Sidekick
            </span>
            {mobileOpen ? (
              <ChevronDown className="w-4 h-4 text-luxe/50" />
            ) : (
              <ChevronUp className="w-4 h-4 text-luxe/50" />
            )}
          </button>
          <AnimatePresence>
            {mobileOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                className="mt-2 rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/95 backdrop-blur-xl p-4 max-h-[40dvh] overflow-y-auto"
              >
                {card}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
