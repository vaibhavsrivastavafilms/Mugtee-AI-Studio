'use client'

import { memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Camera, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const HERO_FRAMES = [
  'https://images.pexels.com/photos/33645190/pexels-photo-33645190.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=640',
  'https://images.unsplash.com/photo-1670324382035-f9cfacc3b59b?crop=entropy&cs=srgb&fm=jpg&q=85&w=640&h=900&fit=crop',
  'https://images.pexels.com/photos/29202430/pexels-photo-29202430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=640',
]

export const HeroSection = memo(function HeroSection({
  dashboardHref = '/create?mode=quick',
  loginHref = '/create?mode=quick',
  signedIn = null,
}: {
  dashboardHref?: string
  loginHref?: string
  signedIn?: boolean | null
}) {
  const ctaHref = signedIn ? dashboardHref : loginHref

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden film-grain">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[min(920px,110vw)] h-[min(920px,85vh)] rounded-full bg-gold-500/[0.07] blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[min(480px,70vw)] h-[min(480px,50vh)] rounded-full bg-gold-600/[0.04] blur-[100px]" />
      </div>

      <div className="container max-w-6xl mx-auto px-5 sm:px-6 py-24 sm:py-28 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-7"
          >
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300/90">
              Cinematic AI Studio
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.08] text-luxe">
              Turn Any Idea Into A{' '}
              <span className="text-gold-gradient">Cinematic Faceless Video</span>
            </h1>
            <p className="text-base sm:text-lg text-luxe/65 leading-relaxed max-w-lg">
              Mugtee is your cinematic AI studio for YouTube Shorts, reels, and visual
              storytelling. Start from your dashboard — script, storyboard, voice, and export.
            </p>

            <Button
              asChild
              className={cn(
                'w-full sm:w-auto min-h-[48px] px-8 rounded-xl text-[13px] tracking-[0.14em] uppercase',
                'bg-gold-gradient text-black font-semibold shadow-gold-glow hover:opacity-90',
                'transition-opacity duration-300 gap-2'
              )}
            >
              <Link href={ctaHref}>
                Create
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex justify-center lg:justify-end"
          >
            <HeroReelMockup />
          </motion.div>
        </div>
      </div>
    </section>
  )
})

const HeroReelMockup = memo(function HeroReelMockup() {
  return (
    <div className="relative w-full max-w-[280px] sm:max-w-[320px]">
      <div className="absolute -inset-4 rounded-[2rem] bg-gold-500/[0.08] blur-2xl" />
      <div className="relative aspect-[9/16] rounded-[1.75rem] overflow-hidden border border-gold-soft bg-black/50 shadow-gold-glow cinematic-success-glow">
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [1, 0.85, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {HERO_FRAMES.map((src, i) => (
            <motion.div
              key={src}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, i === 0 ? 1 : 0, 0] }}
              transition={{
                duration: 12,
                repeat: Infinity,
                delay: i * 4,
                times: [0, 0.08, 0.33],
              }}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="320px"
                className="object-cover"
                unoptimized
                priority={i === 0}
              />
            </motion.div>
          ))}
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 pointer-events-none" />

        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-[9px] tracking-[0.22em] uppercase text-gold-300/90 flex items-center gap-1.5">
          <Camera className="w-3 h-3" /> Storyboard
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-[3px] rounded-full flex-1',
                  i === 0 ? 'bg-gold-400/80' : 'bg-white/15'
                )}
              />
            ))}
          </div>
          <p className="font-display text-sm text-[#F4E7C1] italic leading-snug line-clamp-2">
            &ldquo;Every scroll rewires a circuit you didn&apos;t know you had.&rdquo;
          </p>
          <div className="flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-luxe/45">
            <Film className="w-3 h-3" /> 3 scenes · 60s
          </div>
        </div>
      </div>
    </div>
  )
})
