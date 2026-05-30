'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Film, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { quickCutStudioHref } from '@/lib/create/routes'

const WORKFLOW_STEPS = ['Prompt', 'Hook', 'Script', 'Storyboard', 'Export'] as const

const CREATOR_EXAMPLES = [
  {
    id: 'rome',
    topic: 'What Ancient Rome Looked Like At Its Peak',
    niche: 'Historical documentary',
    prompt: 'What Ancient Rome Looked Like At Its Peak — historical documentary style cinematic reel',
    hook: 'This is what Rome looked like when it ruled the world.',
    workflow: ['Enter idea', 'Hook + script', 'Forum storyboard', '60s reel export'],
    output: 'Marble Forum at golden hour — legions, crowds, aqueducts — documentary pacing with cinematic frames.',
    frames: ['Forum wide · Golden hour', 'Legions · Dust in light', 'Aqueduct · Horizon'],
  },
  {
    id: 'egypt',
    topic: 'A Day Inside Ancient Egypt',
    niche: 'Daily life story',
    prompt: 'A Day Inside Ancient Egypt — daily life cinematic story reel',
    hook: 'One day in Egypt — from sunrise on the Nile to temple dusk.',
    workflow: ['Nile dawn prompt', 'Narration beats', 'Scribe + workshop frames', 'Vertical reel package'],
    output: 'Nile sunrise to temple sunset — scribe rituals, craft workshops, river life in 9:16 cinematic rhythm.',
    frames: ['Nile dawn · Mist', 'Scribe · Papyrus', 'Temple · Sunset glow'],
  },
  {
    id: 'london',
    topic: 'London Before Electricity',
    niche: 'Pre-industrial city',
    prompt: 'London Before Electricity — pre-industrial city cinematic story',
    hook: 'London before the light switch — gaslight, smoke, and cobblestones.',
    workflow: ['Gaslight mood', 'Hook + captions', 'Cobblestone storyboard', 'Reel-ready export'],
    output: 'Gaslit cobblestones, carriage smoke, factory stacks — atmospheric pre-industrial London in reel form.',
    frames: ['Gaslight · Cobbles', 'Carriage · Fog', 'Factory · Smoke stacks'],
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
}

export function CreatorProof({ className }: { className?: string }) {
  return (
    <section
      id="creator-proof"
      className={cn(
        'relative mt-10 sm:mt-14 pt-10 sm:pt-12 border-t border-white/[0.06]',
        className
      )}
      aria-labelledby="creator-proof-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
        <motion.div {...fadeUp} className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-gold-500/25 text-[10px] tracking-[0.28em] uppercase text-gold-300 mb-4">
            <Sparkles className="w-3 h-3" aria-hidden />
            Creator proof
          </div>
          <h2
            id="creator-proof-heading"
            className="font-display text-2xl sm:text-3xl text-luxe leading-snug"
          >
            Prompt → workflow →{' '}
            <span className="text-gold-gradient">final reel</span>
          </h2>
          <p className="mt-2 text-sm text-luxe/55 max-w-xl mx-auto">
            Workflow examples — not testimonials. Real directions Mugtee is built to shape.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {CREATOR_EXAMPLES.map((example, index) => (
            <motion.article
              key={example.id}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: index * 0.06 }}
              className={cn(
                'flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02]',
                'backdrop-blur-md p-5 sm:p-6 hover:border-gold-500/30 transition-colors'
              )}
            >
              <p className="text-[9px] tracking-[0.22em] uppercase text-gold-300/70 mb-2">
                Creator workflow example · {example.niche}
              </p>
              <h3 className="font-display text-lg text-luxe leading-snug">{example.topic}</h3>

              <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2.5">
                <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/40 mb-1">Prompt</p>
                <p className="text-xs text-luxe/70 leading-relaxed line-clamp-2">{example.prompt}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {WORKFLOW_STEPS.map((step, i) => (
                  <span key={step} className="inline-flex items-center gap-1">
                    <span className="text-[9px] tracking-[0.14em] uppercase text-luxe/45 px-2 py-0.5 rounded-md border border-white/[0.06]">
                      {step}
                    </span>
                    {i < WORKFLOW_STEPS.length - 1 ? (
                      <ArrowRight className="w-2.5 h-2.5 text-luxe/20" aria-hidden />
                    ) : null}
                  </span>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2.5">
                <p className="text-[9px] tracking-[0.16em] uppercase text-gold-300/70 mb-1">Hook</p>
                <p className="text-xs text-luxe/80 italic">&ldquo;{example.hook}&rdquo;</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-1.5">
                {example.frames.map((frame) => (
                  <div
                    key={frame}
                    className="aspect-[9/16] rounded-md border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-black/50 flex items-end p-1.5"
                  >
                    <p className="text-[8px] leading-tight text-luxe/45">{frame}</p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-luxe/55 leading-relaxed flex-1">{example.output}</p>

              <Link
                href={quickCutStudioHref({ topic: example.prompt })}
                className={cn(
                  'mt-5 inline-flex items-center justify-center gap-2 min-h-[40px]',
                  'rounded-xl border border-gold-500/25 bg-gold-500/[0.06]',
                  'text-[10px] tracking-[0.14em] uppercase text-gold-200 font-medium',
                  'hover:bg-gold-500/12 hover:border-gold-500/40 transition-colors'
                )}
              >
                <Film className="w-3.5 h-3.5" />
                Try this direction
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
