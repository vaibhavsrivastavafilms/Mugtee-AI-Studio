'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { CinematicHomeHeader } from '@/components/home/CinematicHomeHeader'
import { CinematicHero } from '@/components/home/CinematicHero'
import { MugteeWorldBackground } from '@/components/home/MugteeWorldBackground'
import {
  DemoVideo,
  ShowcaseCarousel,
  BeforeAfterSlider,
  CreatorShowcase,
  AutoPlayVideo,
} from '@/components/home/video'
import {
  goldButton,
  outlineGoldButton,
  STUDIO_DIRECTOR,
  STUDIO_ENTRY,
  STUDIO_QUICK,
} from '@/components/home/cinematic-home-styles'
import {
  DIRECTOR_DEMO,
  EXAMPLE_DEMOS,
  QUICK_CUT_DEMO,
  WATCH_CREATE_DEMO,
} from '@/lib/home/landing-demos'
import { authLoginHref, persistModeEntry } from '@/lib/create/mode-selection'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { cn } from '@/lib/utils'

/** V7 landing — show finished film, don't explain features. */
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
    <div data-cinematic-home className="min-h-[100dvh] overflow-x-clip bg-[#050505] text-white">
      <MugteeWorldBackground />
      <CinematicHomeHeader />
      <CinematicHero />

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        {/* Watch Mugtee Create */}
        <section id="watch" className="py-14 sm:py-20" aria-labelledby="watch-heading">
          <h2
            id="watch-heading"
            className="text-center font-display text-3xl text-white sm:text-5xl"
          >
            Watch Mugtee create
          </h2>
          <div className="mx-auto mt-8 max-w-4xl">
            <DemoVideo demo={WATCH_CREATE_DEMO} preload="metadata" />
          </div>
        </section>

        {/* Quick Cut */}
        <section
          id="quick-cut"
          className="grid items-center gap-8 py-14 lg:grid-cols-[1.05fr_0.95fr] sm:py-20"
          aria-labelledby="quick-heading"
        >
          <AutoPlayVideo
            src={QUICK_CUT_DEMO.src}
            poster={QUICK_CUT_DEMO.poster}
            aspect="vertical"
            preload="none"
            className="mx-auto w-full max-w-sm"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#93C5FD]">
              Quick Cut
            </p>
            <h2
              id="quick-heading"
              className="mt-3 font-display text-3xl leading-tight text-white sm:text-5xl"
            >
              From idea to reel in under a minute.
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-[#B8B8B8]">
              Speed without losing the cinematic finish.
            </p>
            <button
              type="button"
              onClick={goQuick}
              className={cn(goldButton, 'mt-7 min-h-12 px-6 py-3')}
            >
              Try Quick Cut
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </section>

        {/* Director Mode */}
        <section
          id="director"
          className="grid items-center gap-8 py-14 lg:grid-cols-[0.95fr_1.05fr] sm:py-20"
          aria-labelledby="director-heading"
        >
          <div className="order-2 lg:order-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              Director Mode
            </p>
            <h2
              id="director-heading"
              className="mt-3 font-display text-3xl leading-tight text-white sm:text-5xl"
            >
              Direct every frame like a film set.
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-[#B8B8B8]">
              Storyboard, timeline, voice, and export — one suite.
            </p>
            <button
              type="button"
              onClick={goDirector}
              className={cn(outlineGoldButton, 'mt-7 min-h-12 px-6 py-3')}
            >
              Open Director Mode
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <div className="order-1 lg:order-2">
            <AutoPlayVideo
              src={DIRECTOR_DEMO.src}
              poster={DIRECTOR_DEMO.poster}
              aspect="video"
              preload="none"
            />
          </div>
        </section>

        {/* Example creations */}
        <section id="examples" className="py-14 sm:py-20" aria-labelledby="examples-heading">
          <h2
            id="examples-heading"
            className="font-display text-3xl text-white sm:text-5xl"
          >
            Example creations
          </h2>
          <p className="mt-3 max-w-lg text-base text-[#B8B8B8]">
            Finished reels. Real styles.
          </p>
          <ShowcaseCarousel demos={EXAMPLE_DEMOS} className="mt-8" />
        </section>

        {/* Before vs After */}
        <section id="before-after" className="py-14 sm:py-20" aria-labelledby="before-heading">
          <h2
            id="before-heading"
            className="text-center font-display text-3xl text-white sm:text-5xl"
          >
            Before vs after
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-base text-[#B8B8B8]">
            One line in. A finished film out.
          </p>
          <div className="mx-auto mt-8 max-w-4xl">
            <BeforeAfterSlider
              beforeText="A rainy night in Mumbai that still feels like home."
              afterPoster={WATCH_CREATE_DEMO.poster}
            />
          </div>
        </section>

        {/* Testimonials */}
        <section id="stories" className="py-14 sm:py-20" aria-labelledby="stories-heading">
          <h2
            id="stories-heading"
            className="text-center font-display text-3xl text-white sm:text-5xl"
          >
            Creators, briefly
          </h2>
          <CreatorShowcase className="mt-10" />
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-14 sm:py-20" aria-labelledby="pricing-heading">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-[rgba(212,175,55,0.18)] bg-[#191919]/90 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              Pricing
            </p>
            <h2 id="pricing-heading" className="mt-3 font-display text-4xl text-white">
              Free to begin
            </h2>
            <p className="mt-3 text-base text-[#B8B8B8]">
              Create now. Upgrade when you ship more.
            </p>
            <button
              type="button"
              onClick={goStudio}
              className={cn(goldButton, 'mt-7 min-h-12 px-7 py-3')}
            >
              Enter studio
              <Sparkles className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-14 text-center sm:py-20">
          <h2 className="mx-auto max-w-3xl font-display text-4xl leading-tight text-white sm:text-5xl">
            Our story is ready when you are.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={goStudio}
              className={cn(goldButton, 'min-h-12 px-7 py-3')}
            >
              Watch & create
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={goQuick}
              className={cn(outlineGoldButton, 'min-h-12 px-6 py-3')}
            >
              Export a reel
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[rgba(212,175,55,0.12)] px-4 py-8 text-center text-sm text-[#888888]">
        <p>Mugtee — premium AI cinematic companion.</p>
      </footer>
    </div>
  )
}
