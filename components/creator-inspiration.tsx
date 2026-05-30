'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const OUTPUT_TAGS = ['Hook', 'Script', 'Storyboard', 'Captions', 'Thumbnail Idea'] as const

const INSPIRATION_EXAMPLES = [
  {
    title: 'What Ancient Rome Looked Like At Its Peak',
    description:
      'Walk the Forum at golden hour — marble temples, crowded markets, and legions marching through a city built to awe the world.',
    hookPreview: 'This is what Rome looked like when it ruled the world.',
    storyboardPreview: 'Forum · Golden hour · Crowds · Legions marching',
    topic:
      'What Ancient Rome Looked Like At Its Peak — historical documentary style cinematic reel',
  },
  {
    title: 'A Day Inside Ancient Egypt',
    description:
      'Follow a scribe from dawn on the Nile to sunset at the temple — daily rituals, craft workshops, and life along the river.',
    hookPreview: 'One day in Egypt — from sunrise on the Nile to temple dusk.',
    storyboardPreview: 'Nile dawn · Scribe · Workshop · Temple sunset',
    topic: 'A Day Inside Ancient Egypt — daily life cinematic story reel',
  },
  {
    title: 'London Before Electricity',
    description:
      'Gaslight flickers over cobblestones as carriages roll past smoke-stacked factories — a pre-industrial city waking before dawn.',
    hookPreview: 'London before the light switch — gaslight, smoke, and cobblestones.',
    storyboardPreview: 'Gaslight · Cobblestones · Carriages · Factory smoke',
    topic: 'London Before Electricity — pre-industrial city cinematic story',
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
}

export function CreatorInspiration({
  onSelectTopic,
  className,
  title = 'See What Mugtee Can Create',
}: {
  onSelectTopic: (topic: string) => void
  className?: string
  title?: string
}) {
  return (
    <section
      className={cn('mt-10 sm:mt-12 pt-8 sm:pt-10 border-t border-white/[0.06]', className)}
      aria-labelledby="creator-inspiration-heading"
    >
      <motion.div {...fadeUp} className="text-center mb-6 sm:mb-8 px-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-gold-500/25 text-[10px] tracking-[0.28em] uppercase text-gold-300 mb-4">
          <Sparkles className="w-3 h-3" aria-hidden />
          Creator Inspiration
        </div>
        <h2
          id="creator-inspiration-heading"
          className="font-display text-xl sm:text-2xl text-[#F4E7C1]/95 leading-snug"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-luxe/60 max-w-md mx-auto leading-relaxed">
          From ancient civilizations to modern cinematic stories.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {INSPIRATION_EXAMPLES.map((example, index) => (
          <motion.article
            key={example.title}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: index * 0.06 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={cn(
              'group flex flex-col rounded-2xl p-4 sm:p-5',
              'glass border border-gold-soft/80',
              'bg-white/[0.02] backdrop-blur-md',
              'hover:border-gold-500/45 hover:bg-gold-500/[0.04]',
              'hover:shadow-[0_8px_32px_-8px_rgba(212,175,55,0.18)]',
              'transition-colors duration-300'
            )}
          >
            <h3 className="font-display text-base sm:text-[1.05rem] text-luxe group-hover:text-gold-100 transition-colors leading-snug">
              {example.title}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-luxe/55 leading-relaxed">
              {example.description}
            </p>

            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2">
                <p className="text-[9px] tracking-[0.16em] uppercase text-gold-300/70 mb-1">
                  Hook preview
                </p>
                <p className="text-xs text-luxe/70 italic leading-snug line-clamp-2">
                  &ldquo;{example.hookPreview}&rdquo;
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2">
                <p className="text-[9px] tracking-[0.16em] uppercase text-gold-300/70 mb-1">
                  Storyboard preview
                </p>
                <p className="text-[10px] text-luxe/50 tracking-wide leading-snug">
                  {example.storyboardPreview}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {OUTPUT_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md border border-white/[0.06] bg-black/25 text-[9px] tracking-[0.14em] uppercase text-luxe/45"
                >
                  {tag}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onSelectTopic(example.topic)}
              className={cn(
                'mt-4 w-full min-h-[44px] inline-flex items-center justify-center gap-2',
                'rounded-xl border border-gold-500/30 bg-gold-500/[0.08]',
                'text-[11px] tracking-[0.12em] uppercase text-gold-200 font-medium',
                'hover:bg-gold-500/15 hover:border-gold-500/50 hover:text-gold-100',
                'active:scale-[0.98] transition-all duration-200'
              )}
            >
              Generate Similar Story
              <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
