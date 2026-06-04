'use client'

import { CinematicHomeHeader } from '@/components/home/CinematicHomeHeader'
import { CinematicHero } from '@/components/home/CinematicHero'
import { QuickCutCard } from '@/components/home/QuickCutCard'
import { DirectorModeCard } from '@/components/home/DirectorModeCard'
import { WorkflowPipeline } from '@/components/home/WorkflowPipeline'
import { TrustBar } from '@/components/home/TrustBar'
import { DemoReelSection } from '@/components/home/DemoReelSection'
import { CreatorShowcase } from '@/components/home/CreatorShowcase'
import { SocialProofSection } from '@/components/home/SocialProofSection'
import Link from 'next/link'
import { goldButton } from '@/components/home/cinematic-home-styles'

/** Cinematic homepage — hero viewport + scrollable proof, showcase, and pricing CTA. */
export default function CinematicHomePage() {
  return (
    <div
      data-cinematic-home
      className="min-h-[100dvh] bg-[#050505] text-white"
    >
      <div className="flex min-h-[100dvh] flex-col">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-30"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.08), transparent 55%), radial-gradient(ellipse 40% 30% at 10% 80%, rgba(212,175,55,0.05), transparent), radial-gradient(ellipse 40% 30% at 90% 70%, rgba(212,175,55,0.04), transparent)',
        }}
      />

      <CinematicHomeHeader />

      <div className="flex min-h-0 flex-1 flex-col">
        <CinematicHero />

        <main
          id="showcase"
          className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_auto_1fr] gap-2 overflow-hidden px-3 pb-1 sm:gap-2.5 sm:px-4 md:grid-cols-2 md:grid-rows-[1fr_auto] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:grid-rows-1 lg:gap-3 lg:px-6"
        >
          <QuickCutCard className="min-h-0 overflow-hidden md:col-start-1 md:row-start-1" />
          <WorkflowPipeline
            className="hidden min-h-0 lg:flex lg:col-start-2 lg:row-start-1 lg:w-[88px] xl:w-[96px]"
            orientation="vertical"
          />
          <WorkflowPipeline
            className="min-h-0 md:col-span-2 lg:hidden"
            orientation="horizontal"
          />
          <DirectorModeCard className="min-h-0 overflow-hidden md:col-start-2 md:row-start-1 lg:col-start-3" />
        </main>

        <TrustBar />
      </div>

      <DemoReelSection />
      <CreatorShowcase />
      <SocialProofSection />

      <section
        id="pricing-cta"
        className="border-t border-white/[0.06] px-4 py-14 text-center sm:px-6"
      >
        <p className="text-[10px] uppercase tracking-[0.32em] text-[#D4AF37]/70">Cinematic Story Pipeline</p>
        <h2 className="mt-2 font-display text-2xl text-white">Your Cinematic AI Studio</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
          Begin free. Creator at ₹599/mo and Pro at ₹999/mo — join the waitlist; billing opens soon.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/pricing" className={goldButton}>
            View pricing
          </Link>
          <Link
            href="/pricing#faq"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 px-5 text-[11px] uppercase tracking-[0.14em] text-white/80"
          >
            FAQ
          </Link>
        </div>
      </section>
      </div>
    </div>
  )
}
