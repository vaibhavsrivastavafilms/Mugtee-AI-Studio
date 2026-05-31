'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Maximize2, Play } from 'lucide-react'
import { LuxButton } from '@/components/v2/lux-button'
import { TEXT_TO_VIDEO_DEMO_TEMPLATES } from '@/lib/demo/text-to-video-templates'
import { cn } from '@/lib/utils'

const CREATE_HREF = '/studio/create?mode=quick'
const SHOWCASE_ANCHOR = '#see-what-mugtee-creates'

const EGYPT_DEMO =
  TEXT_TO_VIDEO_DEMO_TEMPLATES.find((t) => t.id === 'ancient-egypt-daily-life') ??
  TEXT_TO_VIDEO_DEMO_TEMPLATES[0]

const CREATOR_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80',
] as const

export function LandingHeroSplit({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative px-5 sm:px-6 pt-10 sm:pt-14 pb-8 sm:pb-12 min-h-[calc(100dvh-72px)] flex items-center',
        className
      )}
    >
      <div className="mx-auto w-full max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-14 items-center">
        <div className="space-y-6 lg:pr-4">
          <p className="text-[10px] tracking-[0.38em] uppercase text-[var(--v2-gold)]">
            Cinematic AI Studio
          </p>
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.06] text-[var(--v2-text-primary)]">
            Turn Any Idea Into{' '}
            <span className="italic text-[var(--v2-gold)]">Creator-Ready Content</span>
          </h1>
          <p className="text-base sm:text-lg text-[var(--v2-text-secondary)] max-w-lg leading-relaxed">
            Generate hooks, scripts, storyboards, captions, and thumbnail concepts in one cinematic
            AI studio built for creators.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-2 w-full max-w-lg">
            <LuxButton href={CREATE_HREF} size="lg" className="rounded-full">
              Start Creating Free <ArrowRight className="h-4 w-4" />
            </LuxButton>
            <LuxButton href={SHOWCASE_ANCHOR} variant="secondary" size="lg" className="rounded-full">
              See Example Outputs
            </LuxButton>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2.5">
              {CREATOR_AVATARS.map((src, i) => (
                <div
                  key={src}
                  className="relative h-9 w-9 rounded-full border-2 border-[var(--v2-bg)] overflow-hidden bg-[var(--v2-surface)]"
                  style={{ zIndex: CREATOR_AVATARS.length - i }}
                >
                  <Image src={src} alt="" fill sizes="36px" className="object-cover" unoptimized />
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--v2-text-secondary)]">
              Trusted by <span className="text-[var(--v2-text-primary)]">10,000+</span> creators and
              storytelling brands.
            </p>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <Link
            href={SHOWCASE_ANCHOR}
            className="group relative w-full max-w-[540px] aspect-[16/10] rounded-2xl overflow-hidden border border-[var(--v2-border)] bg-[var(--v2-surface)] v2-hover-scale shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            <Image
              src={EGYPT_DEMO.previewVideoPoster}
              alt="Cinematic ancient Egypt preview"
              fill
              sizes="(max-width: 1024px) 100vw, 540px"
              className="object-cover"
              unoptimized
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/25" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--v2-gold)]/50 bg-black/55 backdrop-blur-sm group-hover:border-[var(--v2-gold)] group-hover:scale-105 transition-all duration-150">
                <Play className="h-7 w-7 text-[var(--v2-gold)] fill-[var(--v2-gold)] ml-1" />
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/90 to-transparent">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
                  <div className="h-full w-[18%] rounded-full bg-[var(--v2-gold)]" />
                </div>
                <span className="text-[10px] tabular-nums text-[var(--v2-text-secondary)] shrink-0">
                  0:00 / 0:32
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] tracking-wider uppercase border border-white/20 text-[var(--v2-text-secondary)] bg-black/40">
                  1080p
                </span>
                <Maximize2
                  className="h-3.5 w-3.5 text-[var(--v2-text-secondary)]"
                  aria-hidden
                />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
