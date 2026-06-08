'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Armchair, ArrowRight, Zap, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCinematicMotionInitial } from '@/components/home/cinematic-home-motion'
import {
  glassPanel,
  goldButton,
  STUDIO_DIRECTOR,
  STUDIO_QUICK,
} from '@/components/home/cinematic-home-styles'
import { authLoginHref, persistModeEntry } from '@/lib/create/mode-selection'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { cn } from '@/lib/utils'

const QUICK_FLOW = ['Idea', 'Script', 'Storyboard', 'Voice', 'MP4'] as const
const DIRECTOR_FLOW = [
  'Idea',
  'Hook',
  'Script',
  'Visual Direction',
  'Storyboard',
  'Motion',
  'Voice',
  'Export',
] as const

type ModeCardProps = {
  icon: LucideIcon
  title: string
  subtitle: string
  flow: readonly string[]
  cta: string
  onSelect: () => void
  delay?: number
}

function ModeCard({ icon: Icon, title, subtitle, flow, cta, onSelect, delay = 0 }: ModeCardProps) {
  const initial = useCinematicMotionInitial({ opacity: 0, y: 14 })

  return (
    <motion.article
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        glassPanel,
        'flex flex-col p-6 sm:p-7 transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.12)]'
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/12">
        <Icon className="h-5 w-5 text-[#D4AF37]" aria-hidden />
      </div>
      <h2 className="mt-4 text-[11px] font-semibold tracking-[0.22em] uppercase text-[#D4AF37]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-white/75">{subtitle}</p>

      <p className="mt-4 text-[9px] uppercase tracking-[0.18em] text-white/35">Flow</p>
      <p className="mt-1.5 text-[11px] text-white/50 leading-relaxed">
        {flow.join(' → ')}
      </p>

      <button
        type="button"
        onClick={onSelect}
        className={cn(goldButton, 'mt-auto pt-8 w-full py-2.5 text-[10px]')}
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
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.08), transparent 55%)',
        }}
      />

      <header className="border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group hover:opacity-90 transition-opacity">
            <span className="block font-display text-xl tracking-[0.12em] uppercase text-[#D4AF37] leading-none">
              Mugtee
            </span>
            <span className="block text-[9px] tracking-[0.32em] uppercase text-white/70 mt-0.5">
              AI Studio
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          initial={fadeUp}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="font-display text-2xl sm:text-3xl text-white">
            How would you like to create?
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Choose your workflow — you can switch modes anytime.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <ModeCard
            icon={Zap}
            title="Quick Cut"
            subtitle="One idea → complete reel"
            flow={QUICK_FLOW}
            cta="Create With Quick Cut"
            onSelect={goQuick}
            delay={0.06}
          />
          <ModeCard
            icon={Armchair}
            title="Director Mode"
            subtitle="Full cinematic control"
            flow={DIRECTOR_FLOW}
            cta="Open Director Mode"
            onSelect={goDirector}
            delay={0.12}
          />
        </div>
      </main>
    </div>
  )
}
