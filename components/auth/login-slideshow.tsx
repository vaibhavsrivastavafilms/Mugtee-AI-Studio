'use client'
// Phase P10 — Cinematic human-focused login slideshow.
// 7 slides, autoplay loop, slow fade + Ken Burns zoom. CSS-driven, no framer for the slides themselves.
import { useEffect, useState } from 'react'

type Slide = { src: string; caption: string; eyebrow?: string }

const SLIDES: Slide[] = [
  { src: 'https://images.unsplash.com/photo-1608858132869-4fe7467333b4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    caption: 'Building a faceless channel used to take weeks.', eyebrow: 'The grind' },
  { src: 'https://images.pexels.com/photos/1334093/pexels-photo-1334093.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
    caption: 'Discover viral opportunities instantly.', eyebrow: 'Idea engine' },
  { src: 'https://images.unsplash.com/photo-1764557175375-9e2bea91530e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    caption: 'Create cinematic faceless documentaries.', eyebrow: 'AI studio' },
  { src: 'https://images.pexels.com/photos/64779/pexels-photo-64779.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
    caption: 'Write like top documentary creators.', eyebrow: 'Script workspace' },
  { src: 'https://images.unsplash.com/photo-1529119368496-2dfda6ec2804?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    caption: 'Manage your entire creator workflow.', eyebrow: 'Pipeline' },
  { src: 'https://images.unsplash.com/photo-1627983580226-eb18c793d9cd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600',
    caption: 'One workflow. Every platform.', eyebrow: 'Publishing' },
  { src: 'https://images.pexels.com/photos/936135/pexels-photo-936135.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=1600',
    caption: 'Build a faceless media business with AI.', eyebrow: 'Your moment' },
]

const DURATION_MS = 6000

export function LoginSlideshow() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), DURATION_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative w-full h-[44vh] sm:h-[52vh] lg:h-[640px] rounded-3xl overflow-hidden glass-strong border border-gold-500/15 shadow-cinema">
      {/* Slides */}
      {SLIDES.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)]"
          style={{ opacity: active === i ? 1 : 0 }}
          aria-hidden={active !== i}
        >
          <img
            src={s.src}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            className={'w-full h-full object-cover transition-transform ease-linear ' + (active === i ? 'animate-kenburns' : 'scale-105')}
            style={{ transformOrigin: i % 2 === 0 ? 'center center' : '60% 40%' }}
          />
          {/* Cinematic gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
        </div>
      ))}

      {/* Brand + caption layer */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center shadow-gold-glow">
            <span className="font-display text-xl text-black leading-none">V</span>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">Mugtee</div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-luxe/70">AI Production OS</div>
          </div>
        </div>

        <div className="min-h-[5.5rem] sm:min-h-[6.5rem]">
          {SLIDES.map((s, i) => (
            <div
              key={i}
              className="transition-all duration-700 ease-out"
              style={{
                opacity: active === i ? 1 : 0,
                transform: active === i ? 'translateY(0)' : 'translateY(8px)',
                position: active === i ? 'relative' : 'absolute',
              }}
              aria-hidden={active !== i}
            >
              {s.eyebrow && (
                <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80 mb-1.5">{s.eyebrow}</div>
              )}
              <p className="font-display text-xl sm:text-2xl lg:text-3xl leading-tight text-white max-w-md drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                {s.caption}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Slide ${i + 1}`}
            className={'h-1 rounded-full transition-all ' + (active === i ? 'bg-gold-300 w-7' : 'bg-white/40 hover:bg-white/70 w-3')}
          />
        ))}
      </div>
    </div>
  )
}
