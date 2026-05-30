'use client'

import { cn } from '@/lib/utils'

function PromptBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-[var(--v2-gold)]/30 bg-[var(--v2-gold)]/5 px-3 py-1 text-[10px] tracking-[0.18em] uppercase text-[var(--v2-gold)]">
      {children}
    </span>
  )
}

function CtaBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-lg border border-[var(--v2-gold)]/40 bg-black/40 px-3 py-1.5 text-[10px] tracking-[0.22em] uppercase text-[var(--v2-gold)] shadow-[0_0_20px_rgba(212,175,55,0.08)]">
      {children}
    </span>
  )
}

function CardShell({
  prompt,
  cta,
  children,
}: {
  prompt: string
  cta: string
  children: React.ReactNode
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-6 shadow-[0_0_40px_rgba(212,175,55,0.04)] hover:border-[var(--v2-gold)]/25 transition-colors duration-200">
      <PromptBadge>{prompt}</PromptBadge>
      <div className="mt-5 flex-1 space-y-4">{children}</div>
      <div className="mt-6 pt-4 border-t border-[var(--v2-border)]">
        <CtaBadge>{cta}</CtaBadge>
      </div>
    </article>
  )
}

function FinanceCreatorCard() {
  return (
    <CardShell prompt="Start a faceless finance channel" cta="Finance Creator">
      <p className="font-display text-lg italic text-[var(--v2-text-primary)] leading-snug">
        &ldquo;I made ₹0 to ₹1 lakh using AI tools.&rdquo;
      </p>
      <div className="rounded-xl border border-[var(--v2-border)] bg-black/30 p-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary)] mb-2">
          Script Preview
        </p>
        <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed whitespace-pre-line">
          {`Most creators think you need a camera.
With AI, you just need one idea.
Here's how I went from zero to ₹1 lakh—
without showing my face once.`}
        </p>
      </div>
      <div className="rounded-xl border border-[var(--v2-border)] bg-black/30 p-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary)] mb-2">
          Caption Preview
        </p>
        <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
          Zero to ₹1L with AI 🤖 No face, no fluff. Save this if you&apos;re building faceless.{' '}
          <span className="text-[var(--v2-gold)]/70">#FacelessCreator #AITools</span>
        </p>
      </div>
    </CardShell>
  )
}

function YouTubeCreatorCard() {
  const weeks = [
    { label: 'Week 1', detail: 'Choose niche' },
    { label: 'Week 2', detail: 'Create content' },
    { label: 'Week 3', detail: 'Optimize' },
    { label: 'Week 4', detail: 'Scale' },
  ]

  return (
    <CardShell prompt="30-Day YouTube Growth Plan" cta="YouTube Creator">
      <div className="grid grid-cols-2 gap-2">
        {weeks.map((week) => (
          <div
            key={week.label}
            className="rounded-lg border border-[var(--v2-border)] bg-black/30 px-3 py-2.5"
          >
            <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--v2-gold)]">
              {week.label}
            </p>
            <p className="mt-1 text-sm text-[var(--v2-text-primary)]">{week.detail}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary)] mb-3">
          Storyboard Preview
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="aspect-[9/16] rounded-md border border-[var(--v2-border)] bg-gradient-to-b from-white/[0.06] to-black/60"
            />
          ))}
        </div>
      </div>
    </CardShell>
  )
}

function InstagramCreatorCard() {
  const slides = [
    'Top 5 AI Side Hustles',
    'Tools',
    'Workflow',
    'Results',
  ]

  return (
    <CardShell prompt="Daily Side Hustle Carousel" cta="Instagram Creator">
      <div className="grid grid-cols-2 gap-2">
        {slides.map((title, i) => (
          <div
            key={title}
            className="rounded-lg border border-[var(--v2-border)] bg-black/30 p-3 aspect-square flex flex-col justify-end"
          >
            <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--v2-gold)]">
              Slide {i + 1}
            </p>
            <p className="mt-1 text-sm text-[var(--v2-text-primary)] leading-snug">{title}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--v2-border)] bg-black/30 p-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-[var(--v2-text-secondary)] mb-2">
          Caption Preview
        </p>
        <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
          4 slides. One side hustle blueprint. Swipe for the AI stack I use daily →{' '}
          <span className="text-[var(--v2-gold)]/70">#SideHustle #AICreator</span>
        </p>
      </div>
    </CardShell>
  )
}

export function CreatorExamplesSection({ className }: { className?: string }) {
  return (
    <section className={cn('px-5 sm:px-6 py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-3">
            Creator Examples
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
            See What Creators Make With Mugtee
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[var(--v2-text-secondary)] max-w-xl mx-auto">
            From one idea to complete creator-ready content.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FinanceCreatorCard />
          <YouTubeCreatorCard />
          <InstagramCreatorCard />
        </div>
      </div>
    </section>
  )
}
