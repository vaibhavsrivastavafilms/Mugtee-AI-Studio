'use client'

import { cn } from '@/lib/utils'

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary)] mb-2">
      {children}
    </p>
  )
}

function OutputCard({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-5 shadow-[0_0_40px_rgba(212,175,55,0.04)] hover:border-[var(--v2-gold)]/25 transition-colors duration-200',
        className
      )}
    >
      <PreviewLabel>{label}</PreviewLabel>
      {children}
    </article>
  )
}

const STORYBOARD_SCENES = ['Scene 1', 'Scene 2', 'Scene 3', 'Scene 4']

export function OutputShowcaseSection({ className }: { className?: string }) {
  return (
    <section className={cn('px-5 sm:px-6 py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-3">
            Output Showcase
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
            See Mugtee In Action
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[var(--v2-text-secondary)] max-w-xl mx-auto">
            Turn one idea into creator-ready content.
          </p>
        </div>

        <div className="space-y-6">
          <article className="rounded-2xl border border-[var(--v2-gold)]/30 bg-[var(--v2-surface)] p-6 shadow-[0_0_40px_rgba(212,175,55,0.06)] hover:border-[var(--v2-gold)]/40 transition-colors duration-200">
            <span className="inline-block rounded-full border border-[var(--v2-gold)]/30 bg-[var(--v2-gold)]/5 px-3 py-1 text-[10px] tracking-[0.18em] uppercase text-[var(--v2-gold)]">
              Your Idea
            </span>
            <p className="mt-4 font-display text-xl sm:text-2xl italic text-[var(--v2-text-primary)] leading-snug">
              &ldquo;A father teaching filmmaking to his son&rdquo;
            </p>
          </article>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <OutputCard label="Hook">
              <p className="font-display text-lg italic text-[var(--v2-text-primary)] leading-snug">
                He never said he loved me.
                <br />
                He filmed it instead.
              </p>
            </OutputCard>

            <OutputCard label="Script Preview" className="md:col-span-1 lg:col-span-1">
              <div className="rounded-xl border border-[var(--v2-border)] bg-black/30 p-4">
                <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed whitespace-pre-line font-mono">
                  {`INT. GARAGE — DAY

A worn camera rests on a workbench. The FATHER adjusts the lens while his SON watches, wide-eyed.

FATHER
Every story starts with what you choose to frame.`}
                </p>
              </div>
            </OutputCard>

            <OutputCard label="Storyboard Preview" className="md:col-span-2 lg:col-span-1">
              <div className="grid grid-cols-4 gap-2">
                {STORYBOARD_SCENES.map((scene) => (
                  <div key={scene} className="space-y-1.5">
                    <div className="aspect-[9/16] rounded-md border border-[var(--v2-border)] bg-gradient-to-b from-white/[0.06] to-black/60" />
                    <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--v2-text-secondary)] text-center truncate">
                      {scene}
                    </p>
                  </div>
                ))}
              </div>
            </OutputCard>

            <OutputCard label="Caption Preview">
              <div className="rounded-xl border border-[var(--v2-border)] bg-black/30 p-4">
                <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
                  Some lessons aren&apos;t spoken—they&apos;re captured frame by frame. Save this if
                  you&apos;re turning family moments into film.{' '}
                  <span className="text-[var(--v2-gold)]/70">
                    #Filmmaking #FatherAndSon #Storytelling
                  </span>
                </p>
              </div>
            </OutputCard>

            <OutputCard label="Thumbnail Idea" className="md:col-span-1 lg:col-span-2">
              <div className="rounded-xl border border-[var(--v2-border)] bg-black/30 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="aspect-video sm:w-40 shrink-0 rounded-lg border border-[var(--v2-border)] bg-gradient-to-br from-white/[0.08] via-black/40 to-black/70" />
                <div>
                  <p className="font-display text-xl text-[var(--v2-text-primary)] leading-snug">
                    The Lessons That Stay
                  </p>
                  <p className="mt-2 text-sm text-[var(--v2-text-secondary)]">
                    Warm garage light · father and son · cinematic 16:9 frame
                  </p>
                </div>
              </div>
            </OutputCard>
          </div>
        </div>
      </div>
    </section>
  )
}
