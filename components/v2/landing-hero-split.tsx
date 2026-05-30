'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { LuxButton } from '@/components/v2/lux-button'
import { cn } from '@/lib/utils'

const HERO_MAIN =
  'https://images.unsplash.com/photo-1608858132869-4fe7467333b4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200'
const THUMBNAILS = [
  'https://images.pexels.com/photos/33645190/pexels-photo-33645190.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=280',
  'https://images.unsplash.com/photo-1670324382035-f9cfacc3b59b?crop=entropy&cs=srgb&fm=jpg&q=85&w=280&h=400&fit=crop',
  'https://images.pexels.com/photos/29202430/pexels-photo-29202430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=280',
] as const

const DEMO_HREF = '/cinematic/examples/psychology-attention'

export function LandingHeroSplit({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 pt-10 sm:pt-14 pb-16 sm:pb-20 min-h-[calc(100dvh-72px)] flex items-center',
        className
      )}
    >
      <div className="mx-auto w-full max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
        <div className="space-y-6 lg:pr-4">
          <p className="text-[10px] tracking-[0.38em] uppercase text-[var(--v2-gold)]">
            Cinematic AI Studio
          </p>
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.06] text-[var(--v2-text-primary)]">
            From Idea to{' '}
            <span className="italic text-[var(--v2-gold)]">Cinematic Reel</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--v2-text-secondary)] max-w-md leading-relaxed">
            Script, storyboard, voice, and export — one cinematic pipeline for Shorts,
            reels, and faceless storytelling.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <LuxButton href="/create?mode=quick" size="lg" className="rounded-full">
              Start Creating <ArrowRight className="h-4 w-4" />
            </LuxButton>
            <LuxButton href={DEMO_HREF} variant="secondary" size="lg" className="rounded-full">
              <Play className="h-4 w-4 fill-current" />
              Watch Demo
            </LuxButton>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="flex items-stretch gap-3 w-full max-w-[520px]">
            <div className="hidden sm:flex flex-col gap-2 shrink-0 pt-6">
              {THUMBNAILS.map((src, i) => (
                <div
                  key={src}
                  className={cn(
                    'relative w-[52px] h-[72px] rounded-lg overflow-hidden border',
                    i === 0
                      ? 'border-[var(--v2-gold)]/50'
                      : 'border-[var(--v2-border)] opacity-70'
                  )}
                >
                  <Image src={src} alt="" fill sizes="52px" className="object-cover" unoptimized />
                </div>
              ))}
            </div>

            <Link
              href={DEMO_HREF}
              className="group relative flex-1 aspect-[4/5] sm:aspect-[16/11] max-h-[420px] rounded-2xl overflow-hidden border border-[var(--v2-border)] bg-[var(--v2-surface)] v2-hover-scale"
            >
              <Image
                src={HERO_MAIN}
                alt="Cinematic reel preview"
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className="object-cover"
                unoptimized
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--v2-gold)]/40 bg-black/50 backdrop-blur-sm group-hover:border-[var(--v2-gold)] transition-colors">
                  <Play className="h-6 w-6 text-[var(--v2-gold)] fill-[var(--v2-gold)] ml-0.5" />
                </span>
              </div>
            </Link>
          </div>

          <div className="absolute -bottom-2 right-4 sm:right-8 z-10 pointer-events-none">
            <MugteeOrb state="idle" size={88} useLogo className="drop-shadow-[0_8px_32px_rgba(212,175,55,0.35)]" />
          </div>
        </div>
      </div>
    </section>
  )
}
