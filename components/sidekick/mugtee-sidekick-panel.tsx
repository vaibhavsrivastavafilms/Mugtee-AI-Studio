'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { cn } from '@/lib/utils'
import {
  pickSidekickMessage,
  SIDEKICK_ENCOURAGEMENT,
} from '@/lib/sidekick/sidekick-messages'
import { buildTodaysBrief } from '@/lib/sidekick/todays-brief'
import {
  fetchCreatorMemoryProfile,
  type CreatorMemoryProfile,
} from '@/lib/creator/creator-memory'
import {
  resolveCreatorJourney,
  JOURNEY_UNLOCK_MESSAGES,
  type CreatorJourneySnapshot,
  type CreatorJourneyLevel,
} from '@/lib/sidekick/creator-journey'
import { quickCutStudioHref, STUDIO } from '@/lib/create/routes'
import { toast } from 'sonner'

const LS_COLLAPSED = 'mugtee:sidekick:collapsed:v1'
const LS_JOURNEY_LEVEL = 'mugtee:creator-journey-level:v1'

function isSidekickRoute(pathname: string): boolean {
  if (pathname === '/dashboard') return true
  if (pathname === '/studio' || pathname.startsWith('/studio/')) return true
  if (pathname.startsWith('/projects')) return true
  if (pathname.startsWith('/create')) return true
  if (pathname.startsWith('/settings')) return true
  return false
}

function SidekickCard({
  profile,
  journey,
  motivation,
  profileLoaded,
}: {
  profile: CreatorMemoryProfile
  journey: CreatorJourneySnapshot | null
  motivation: string
  profileLoaded: boolean
}) {
  const brief = useMemo(() => buildTodaysBrief(profile, null), [profile])

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <MugteeOrb state="idle" size={36} useLogo className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75">
            Mugtee · Sidekick
          </p>
          <p className="text-sm text-luxe/90 leading-relaxed">{brief.greeting}</p>
          <p className="text-[11px] text-luxe/55">{brief.goalLine}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] px-3 py-2.5 space-y-1.5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/80">
          Today&apos;s opportunity
        </p>
        <p className="text-sm text-luxe/90 font-medium leading-snug">{brief.recommendedTopic}</p>
        <p className="text-[11px] text-gold-200/85 italic">&ldquo;{brief.recommendedHook}&rdquo;</p>
        <Link
          href={quickCutStudioHref({ topic: brief.recommendedTopic.slice(0, 120) })}
          className="inline-flex items-center gap-1 text-[10px] tracking-[0.16em] uppercase text-gold-300/70 hover:text-gold-200 transition mt-1"
        >
          <Sparkles className="w-3 h-3" />
          Ask Mugtee
        </Link>
      </div>

      <p className="text-[11px] text-luxe/60 italic leading-relaxed">&ldquo;{motivation}&rdquo;</p>

      {journey ? (
        <div className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] tracking-[0.2em] uppercase text-luxe/45">
              Creator progress
            </span>
            <span className="text-xs font-medium text-gold-200">{journey.label}</span>
          </div>
          <p className="text-[10px] text-luxe/40 mt-1">{journey.progressHint}</p>
        </div>
      ) : null}

      {profileLoaded ? (
        <Link
          href={STUDIO.settings}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/60 hover:text-gold-200 transition"
        >
          <Sparkles className="w-3 h-3" />
          Tune my creator profile
        </Link>
      ) : null}
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
          if (alive) {
            const snapshot = resolveCreatorJourney(projects, generations)
            setJourney(snapshot)
            try {
              const prev = localStorage.getItem(LS_JOURNEY_LEVEL) as CreatorJourneyLevel | null
              if (prev && prev !== snapshot.level) {
                toast.success(JOURNEY_UNLOCK_MESSAGES[snapshot.level], {
                  description: snapshot.label,
                  duration: 5000,
                })
              }
              localStorage.setItem(LS_JOURNEY_LEVEL, snapshot.level)
            } catch {}
          }
        }
      } catch {
        if (alive) setJourney(resolveCreatorJourney(0, 0))
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const motivation = useMemo(
    () => pickSidekickMessage(tick + (profile.creatorName?.length ?? 0), SIDEKICK_ENCOURAGEMENT),
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

  const profileLoaded = Boolean(profile.creatorName || profile.niche)

  const card = (
    <SidekickCard
      profile={profile}
      journey={journey}
      motivation={motivation}
      profileLoaded={profileLoaded}
    />
  )

  return (
    <>
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
