'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Armchair, ArrowRight, Zap, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import {
  STUDIO_DIRECTOR,
  STUDIO_QUICK,
} from '@/components/home/cinematic-home-styles'
import { authLoginHref, persistModeEntry } from '@/lib/create/mode-selection'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { cn } from '@/lib/utils'
import { MugteeCompanionCharacter } from '@/components/home/MugteeCompanionCharacter'
import { MugteeWorldBackground } from '@/components/home/MugteeWorldBackground'

const QUICK_FLOW = ['Idea', 'Story', 'Look', 'Voice', 'Share'] as const
const DIRECTOR_FLOW = [
  'Idea',
  'Research',
  'Story',
  'Visual world',
  'Scenes',
  'Rhythm',
  'Voice',
  'Share',
] as const

type ModeCardProps = {
  icon: LucideIcon
  title: string
  subtitle: string
  flow: readonly string[]
  cta: string
  onSelect: () => void
  tone: 'quick' | 'director'
  delay?: number
}

function ModeCard({
  icon: Icon,
  title,
  subtitle,
  flow,
  cta,
  onSelect,
  tone,
  delay = 0,
}: ModeCardProps) {
  const initial = useCinematicMotionInitial({ opacity: 0, y: 14 })
  const quick = tone === 'quick'

  return (
    <motion.article
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        'mugtee-world-card flex min-h-[28rem] flex-col overflow-hidden rounded-[2rem] border border-[rgba(212,175,55,0.18)] bg-[#191919] p-6 text-white shadow-[0_28px_80px_rgba(0,0,0,0.55)] sm:p-7',
        quick && 'relative'
      )}
    >
      {quick ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#60A5FA]/50 to-transparent"
          aria-hidden
        />
      ) : null}

      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl border',
          quick
            ? 'border-[rgba(96,165,250,0.35)] bg-[#141414]'
            : 'border-[rgba(212,175,55,0.35)] bg-[#141414]'
        )}
      >
        <Icon
          className={cn('h-5 w-5', quick ? 'text-[#93C5FD]' : 'text-[#D4AF37]')}
          aria-hidden
        />
      </div>
      <h2 className="mt-5 font-display text-4xl leading-tight text-white">{title}</h2>
      <p className="mt-3 text-base leading-7 text-[#B8B8B8]">{subtitle}</p>

      <p
        className={cn(
          'mt-6 text-[10px] font-semibold uppercase tracking-[0.18em]',
          quick ? 'text-[#93C5FD]' : 'text-[#D4AF37]'
        )}
      >
        How Mugtee helps
      </p>
      <p className="mt-2 text-sm leading-7 text-[#888888]">{flow.join(' → ')}</p>

      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4',
          quick
            ? 'border border-[rgba(96,165,250,0.45)] bg-[#141414] text-[#E0F2FE] shadow-[0_0_28px_rgba(96,165,250,0.12)] hover:border-[#93C5FD]/60 focus-visible:ring-[#60A5FA]/25'
            : 'bg-gradient-to-r from-[#E6C252] via-[#D4AF37] to-[#B8962E] text-[#050505] shadow-[0_0_28px_rgba(212,175,55,0.22)] focus-visible:ring-[#D4AF37]/25'
        )}
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </motion.article>
  )
}

export function StudioModeSelectionPage() {
  const router = useRouter()
  const { ready, user } = useAuthHydration()
  const fadeUp = useCinematicMotionInitial({ opacity: 0, y: 8 })

  const goQuick = () => {
    persistModeEntry('quick')
    if (!ready) return
    router.push(user ? STUDIO_QUICK : authLoginHref('quick'))
  }

  const goDirector = () => {
    persistModeEntry('director')
    if (!ready) return
    router.push(user ? STUDIO_DIRECTOR : authLoginHref('director'))
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050505] text-white">
      <MugteeWorldBackground />
      <header className="relative z-10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-[rgba(212,175,55,0.18)] bg-[#0D0D0D]/80 px-5 shadow-[0_16px_42px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <Link href="/" className="group hover:opacity-90 transition-opacity">
            <span className="block font-display text-2xl leading-none text-white">Mugtee</span>
            <span className="mt-0.5 block text-[9px] uppercase tracking-[0.24em] text-[#888888]">
              Choose your studio
            </span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          initial={fadeUp}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <MugteeCompanionCharacter size="sm" mood="curious" />
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl leading-tight text-white sm:text-6xl">
            Choose how you want to create.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#B8B8B8]">
            Quick Cut is fast and focused. Director Mode is cinematic and precise. The same Mugtee
            adapts to the way you want to create.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <ModeCard
            icon={Zap}
            title="Quick Cut"
            subtitle="Momentum-first creation — idea to finished reel with speed and clarity."
            flow={QUICK_FLOW}
            cta="Make something now"
            onSelect={goQuick}
            tone="quick"
            delay={0.06}
          />
          <ModeCard
            icon={Armchair}
            title="Director Mode"
            subtitle="A premium cinematic studio where every creative decision feels intentional."
            flow={DIRECTOR_FLOW}
            cta="Enter the studio"
            onSelect={goDirector}
            tone="director"
            delay={0.12}
          />
        </div>
      </main>
    </div>
  )
}
