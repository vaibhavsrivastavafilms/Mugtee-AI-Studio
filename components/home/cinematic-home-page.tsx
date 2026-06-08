'use client'

import { useRouter } from 'next/navigation'
import { Armchair, Zap } from 'lucide-react'
import { CinematicHomeHeader } from '@/components/home/CinematicHomeHeader'
import { CinematicHero } from '@/components/home/CinematicHero'
import { LandingProductCard } from '@/components/home/LandingProductCard'
import { LandingHowItWorks } from '@/components/home/LandingHowItWorks'
import { LandingSocialProof } from '@/components/home/LandingSocialProof'
import {
  STUDIO_DIRECTOR,
  STUDIO_ENTRY,
  STUDIO_QUICK,
} from '@/components/home/cinematic-home-styles'
import { authLoginHref, persistModeEntry } from '@/lib/create/mode-selection'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'

/** Minimal conversion-focused landing — Quick Cut + Director Mode first. */
export default function CinematicHomePage() {
  const router = useRouter()
  const { ready, user } = useAuthHydration()

  const goStudio = () => router.push(STUDIO_ENTRY)

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
    <div data-cinematic-home className="min-h-[100dvh] bg-[#050505] text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.08), transparent 55%), radial-gradient(ellipse 40% 30% at 10% 80%, rgba(212,175,55,0.05), transparent), radial-gradient(ellipse 40% 30% at 90% 70%, rgba(212,175,55,0.04), transparent)',
        }}
      />

      <CinematicHomeHeader />
      <CinematicHero />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pb-16">
        <section
          id="showcase"
          className="grid gap-4 sm:grid-cols-2 sm:gap-5"
          aria-label="Choose your workflow"
        >
          <LandingProductCard
            icon={Zap}
            title="Quick Cut"
            description="Generate a complete reel in minutes."
            detail="Input an idea. Mugtee creates everything automatically."
            ctaLabel="Start Quick Cut"
            href={STUDIO_QUICK}
            onClick={(e) => {
              e.preventDefault()
              goQuick()
            }}
          />
          <LandingProductCard
            icon={Armchair}
            title="Director Mode"
            description="Control every scene."
            detail="Edit script, visuals, motion, voice and timing."
            ctaLabel="Open Director Mode"
            href={STUDIO_DIRECTOR}
            onClick={(e) => {
              e.preventDefault()
              goDirector()
            }}
          />
        </section>

        <LandingHowItWorks />
        <LandingSocialProof />

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={goStudio}
            className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors"
          >
            Not sure? Compare workflows →
          </button>
        </div>
      </main>
    </div>
  )
}
