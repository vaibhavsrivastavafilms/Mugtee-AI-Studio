'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { goldButton, ghostButton } from '@/components/home/cinematic-home-styles'
import { authLoginHref, persistModeEntry } from '@/lib/create/mode-selection'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { useRouter } from 'next/navigation'
import { STUDIO_QUICK } from '@/components/home/cinematic-home-styles'

/** Hero demo reel — muted autoplay when asset exists; cinematic placeholder otherwise. */
export function DemoReelSection({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loaded, setLoaded] = useState(false)
  const router = useRouter()
  const { ready, user } = useAuthHydration()

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting)
        if (visible) {
          void el.play().catch(() => undefined)
        } else {
          el.pause()
        }
      },
      { rootMargin: '80px', threshold: 0.25 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loaded])

  const handleCreate = (e: React.MouseEvent) => {
    e.preventDefault()
    persistModeEntry('quick')
    if (!ready) return
    router.push(user ? STUDIO_QUICK : authLoginHref('quick'))
  }

  return (
    <section
      id="demo-reel"
      className={cn('border-t border-white/[0.06] bg-[#050505] px-4 py-12 sm:px-6', className)}
    >
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-2xl text-white sm:text-3xl">
          Turn Stories Into Cinematic Moments
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-white/50">
          Watch the reel studio flow — idea, hook, frames, voice, and export-ready delivery.
        </p>
      </div>

      <div className="relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-black/60 shadow-[0_0_48px_rgba(212,175,55,0.12)]">
        {!loaded ? (
          <div
            className="absolute inset-0 shimmer-cinematic bg-gradient-to-br from-[#1a1510] via-[#050505] to-[#0d0b08]"
            aria-hidden
          />
        ) : null}
        <video
          ref={videoRef}
          className="aspect-[9/16] max-h-[min(70vh,640px)] w-full object-cover sm:aspect-video sm:max-h-[420px]"
          muted
          playsInline
          loop
          preload="none"
          poster="/logo.png"
          onLoadedData={() => setLoaded(true)}
        >
          <source src="/demo-reel.mp4" type="video/mp4" />
        </video>
        {!loaded ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-black/50">
              <Play className="h-6 w-6 fill-[#D4AF37] text-[#D4AF37]" aria-hidden />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={handleCreate} className={cn(goldButton, 'px-6 py-3')}>
          Create Your First Story
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </button>
        <Link href="/pricing" className={cn(ghostButton, 'px-6 py-3')}>
          View pricing
        </Link>
      </div>
    </section>
  )
}
