'use client'

import { cn } from '@/lib/utils'

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-[var(--v2-gold)]/30 bg-[var(--v2-gold)]/5 px-3 py-1 text-[10px] tracking-[0.18em] uppercase text-[var(--v2-gold)]">
      {children}
    </span>
  )
}

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary)] mb-2">
      {children}
    </p>
  )
}

export function GalleryCard({
  badge,
  prompt,
  children,
}: {
  badge: string
  prompt: string
  children: React.ReactNode
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-6 shadow-[0_0_40px_rgba(212,175,55,0.04)] hover:border-[var(--v2-gold)]/25 transition-colors duration-200">
      <Badge>{badge}</Badge>
      <p className="mt-4 font-display text-base italic text-[var(--v2-text-primary)] leading-snug">
        &ldquo;{prompt}&rdquo;
      </p>
      <div className="mt-5 flex-1">{children}</div>
    </article>
  )
}

function StorytellingCard() {
  return (
    <GalleryCard badge="Storytelling" prompt="A father teaching filmmaking to his son">
      <PreviewLabel>Hook</PreviewLabel>
      <p className="font-display text-lg italic text-[var(--v2-text-primary)] leading-snug whitespace-pre-line">
        He never said he loved me.{'\n'}He filmed it instead.
      </p>
    </GalleryCard>
  )
}

function YouTubeCard() {
  const ideas = [
    'Why Rome fell in 476 AD — the real story',
    '5 empires that collapsed overnight',
    'The invention that changed warfare forever',
  ]

  return (
    <GalleryCard badge="YouTube" prompt="30-Day Faceless History Channel">
      <PreviewLabel>Content Ideas</PreviewLabel>
      <ul className="space-y-2">
        {ideas.map((idea) => (
          <li
            key={idea}
            className="rounded-lg border border-[var(--v2-border)] bg-black/30 px-3 py-2.5 text-sm text-[var(--v2-text-secondary)] leading-snug"
          >
            {idea}
          </li>
        ))}
      </ul>
    </GalleryCard>
  )
}

function InstagramCard() {
  const slides = ['Slide 1', 'Slide 2', 'Slide 3', 'Slide 4']

  return (
    <GalleryCard badge="Instagram" prompt="13 Websites That Pay Daily">
      <PreviewLabel>Carousel Generated</PreviewLabel>
      <div className="grid grid-cols-2 gap-2">
        {slides.map((slide, i) => (
          <div
            key={slide}
            className="aspect-square rounded-lg border border-[var(--v2-border)] bg-gradient-to-b from-white/[0.06] to-black/60 flex flex-col justify-end p-2.5"
          >
            <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--v2-gold)]">
              {slide}
            </p>
            <p className="mt-0.5 text-xs text-[var(--v2-text-primary)] truncate">
              {i === 0
                ? '13 Sites That Pay'
                : i === 1
                  ? 'Daily Payouts'
                  : i === 2
                    ? 'How to Start'
                    : 'Save This'}
            </p>
          </div>
        ))}
      </div>
    </GalleryCard>
  )
}

function DocumentaryCard() {
  const scenes = ['Scene 1', 'Scene 2', 'Scene 3', 'Scene 4']

  return (
    <GalleryCard badge="Documentary" prompt="The Fall of Nokia">
      <PreviewLabel>Storyboard Generated</PreviewLabel>
      <div className="grid grid-cols-4 gap-2">
        {scenes.map((scene) => (
          <div key={scene} className="space-y-1.5">
            <div className="aspect-[9/16] rounded-md border border-[var(--v2-border)] bg-gradient-to-b from-white/[0.06] to-black/60" />
            <p className="text-[9px] tracking-[0.14em] uppercase text-[var(--v2-text-secondary)] text-center truncate">
              {scene}
            </p>
          </div>
        ))}
      </div>
    </GalleryCard>
  )
}

function EducationalCard() {
  return (
    <GalleryCard badge="Educational" prompt="AI Tools For Students">
      <PreviewLabel>Script Generated</PreviewLabel>
      <div className="rounded-xl border border-[var(--v2-border)] bg-black/30 p-4">
        <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed whitespace-pre-line font-mono">
          {`INT. DORM ROOM — NIGHT

A student opens their laptop. Three AI tabs glow on screen.

NARRATOR (V.O.)
These five tools cut my study time in half.`}
        </p>
      </div>
    </GalleryCard>
  )
}

function CreatorGrowthCard() {
  return (
    <GalleryCard badge="Creator Growth" prompt="Start A Finance Channel">
      <div className="space-y-4">
        <div>
          <PreviewLabel>Hook</PreviewLabel>
          <p className="font-display text-lg italic text-[var(--v2-text-primary)] leading-snug">
            &ldquo;I made ₹0 to ₹1 lakh using AI tools.&rdquo;
          </p>
        </div>
        <div className="rounded-xl border border-[var(--v2-border)] bg-black/30 p-4">
          <PreviewLabel>Caption Generated</PreviewLabel>
          <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
            Zero to ₹1L with AI 🤖 No face, no fluff. Save this if you&apos;re building faceless.{' '}
            <span className="text-[var(--v2-gold)]/70">#FacelessCreator #AITools</span>
          </p>
        </div>
      </div>
    </GalleryCard>
  )
}

export function MadeWithMugteeStaticGrid({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      <StorytellingCard />
      <YouTubeCard />
      <InstagramCard />
      <DocumentaryCard />
      <EducationalCard />
      <CreatorGrowthCard />
    </div>
  )
}
