'use client'

import { motion } from 'framer-motion'
import { Film } from 'lucide-react'
import { cn } from '@/lib/utils'

const SHOWCASE_ITEMS = [
  {
    id: 'myth',
    title: 'Mythology reel',
    mood: 'Gold dust · slow push-in',
    frames: ['Hook locked', '6 scenes', 'Voice + pack'],
  },
  {
    id: 'docu',
    title: 'Travel memoir',
    mood: 'Warm grain · handheld feel',
    frames: ['Emotional hook', 'Storyboard', 'Creator pack'],
  },
  {
    id: 'founder',
    title: 'Founder story',
    mood: 'Studio light · shallow depth',
    frames: ['Script beats', 'Captions', 'Export ready'],
  },
] as const

type CreatorShowcaseProps = {
  className?: string
}

/** Made With Mugtee — cinematic cards with restrained hover motion. */
export function CreatorShowcase({ className }: CreatorShowcaseProps) {
  return (
    <section
      id="made-with-mugtee"
      className={cn('border-t border-white/[0.06] bg-[#050505] px-4 py-14 sm:px-6', className)}
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-[10px] uppercase tracking-[0.32em] text-[#D4AF37]/70">
          Made with Mugtee
        </p>
        <h2 className="mt-2 text-center font-display text-2xl text-white sm:text-3xl">
          Cinematic stories, finished frames
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-white/50">
          Real creator workflows — hook, script, storyboard, voice, and export in one emotional arc.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE_ITEMS.map((item, index) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="group relative overflow-hidden rounded-2xl border border-[#D4AF37]/15 bg-gradient-to-b from-white/[0.05] to-transparent p-5 shadow-[0_0_40px_rgba(212,175,55,0.06)]"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden
                style={{
                  background:
                    'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,175,55,0.12), transparent 70%)',
                }}
              />
              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10">
                  <Film className="h-5 w-5 text-[#D4AF37]" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-white">{item.title}</h3>
                  <p className="mt-0.5 text-[11px] text-white/45">{item.mood}</p>
                </div>
              </div>
              <ul className="relative mt-4 flex flex-wrap gap-2">
                {item.frames.map((frame) => (
                  <li
                    key={frame}
                    className="rounded-lg border border-white/[0.08] bg-black/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-white/55"
                  >
                    {frame}
                  </li>
                ))}
              </ul>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
