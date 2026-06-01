'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { CreatorMode } from '@/lib/create/routes'

type Slide = { src: string; caption: string; eyebrow?: string }

const QUICK_CUT_SLIDES: Slide[] = [
  {
    src: 'https://images.unsplash.com/photo-1608858132869-4fe7467333b4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    caption: 'One idea becomes a cinematic reel in seconds.',
    eyebrow: 'Idea Input',
  },
  {
    src: 'https://images.pexels.com/photos/1334093/pexels-photo-1334093.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
    caption: 'Hooks tuned for retention on Shorts and reels.',
    eyebrow: 'Hook Generation',
  },
  {
    src: 'https://images.unsplash.com/photo-1764557175375-9e2bea91530e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    caption: 'Storyboard grids with cinematic framing cues.',
    eyebrow: 'Storyboard',
  },
  {
    src: 'https://images.pexels.com/photos/64779/pexels-photo-64779.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
    caption: 'Voice, pacing, and captions synced to every beat.',
    eyebrow: 'Captions + Voice',
  },
  {
    src: 'https://images.unsplash.com/photo-1529119368496-2dfda6ec2804?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    caption: 'Export-ready reels — download or publish.',
    eyebrow: 'Export Reel',
  },
]

const DIRECTOR_SLIDES: Slide[] = [
  {
    src: 'https://images.unsplash.com/photo-1627983580226-eb18c793d9cd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    caption: 'Scene-by-scene control for full cinematic direction.',
    eyebrow: 'Director Mode',
  },
  {
    src: 'https://images.pexels.com/photos/936135/pexels-photo-936135.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
    caption: 'Timeline, storyboards, and visual compile in one workspace.',
    eyebrow: 'Workspace',
  },
]

const DURATION_MS = 5500

const MODE_EYEBROW: Partial<Record<CreatorMode, string>> = {
  quick: 'Quick Cut',
  director: 'Director Mode',
}

export function LoginSlideshow({ mode }: { mode?: CreatorMode | null }) {
  const slides = mode === 'director' ? DIRECTOR_SLIDES : QUICK_CUT_SLIDES
  const [active, setActive] = useState(0)

  useEffect(() => {
    setActive(0)
  }, [mode])

  useEffect(() => {
    const id = setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      DURATION_MS
    )
    return () => clearInterval(id)
  }, [slides.length])

  return (
    <div className="relative w-full h-[44vh] sm:h-[52vh] lg:h-[640px] rounded-3xl overflow-hidden glass-strong border border-gold-500/15 shadow-cinema">
      {slides.map((s, i) => {
        const isActive = active === i
        return (
        <div
          key={i}
          className={
            'absolute inset-0 transition-opacity duration-1400 ease-cinematic ' +
            (isActive ? 'opacity-100' : 'opacity-0')
          }
          {...(isActive ? {} : { 'aria-hidden': 'true' as const })}
        >
          <Image
            src={s.src}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 640px"
            priority={i === 0}
            className={
              'object-cover transition-transform ease-linear ' +
              (active === i ? 'animate-kenburns' : 'scale-105') +
              (i % 2 === 0 ? ' origin-center' : ' origin-[60%_40%]')
            }
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
          <div className="absolute inset-0 shimmer-cinematic opacity-20 pointer-events-none" />
        </div>
        )
      })}

      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold-glow">
            <span className="font-display text-lg font-bold text-black">M</span>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Mugtee
            </div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-luxe/70">
              {mode ? (MODE_EYEBROW[mode] ?? 'Quick Cut') : 'Quick Cut'}
            </div>
          </div>
        </div>

        <div className="min-h-[5.5rem] sm:min-h-[6.5rem]">
          {slides.map((s, i) => {
            const isActive = active === i
            return (
            <div
              key={i}
              className={
                'transition-all duration-700 ease-out ' +
                (isActive
                  ? 'relative opacity-100 translate-y-0'
                  : 'absolute opacity-0 translate-y-2')
              }
              {...(isActive ? {} : { 'aria-hidden': 'true' as const })}
            >
              {s.eyebrow && (
                <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80 mb-1.5">
                  {s.eyebrow}
                </div>
              )}
              <p className="font-display text-xl sm:text-2xl lg:text-3xl leading-tight text-white max-w-md drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                {s.caption}
              </p>
            </div>
            )
          })}
        </div>

        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setActive(i)}
              className={
                'h-1 rounded-full transition-all duration-300 ' +
                (active === i ? 'w-6 bg-gold-400' : 'w-2 bg-white/20')
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
