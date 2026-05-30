'use client'

import { cn } from '@/lib/utils'

const FLOW_STEPS = [
  'Idea',
  'Hook',
  'Script',
  'Storyboard',
  'Caption',
  'Create Video',
  'Publish',
] as const

const MUGTEE_OUTPUTS = [
  'Hooks',
  'Scripts',
  'Storyboards',
  'Captions',
  'Thumbnail Ideas',
] as const

const TOOL_CHIPS = ['Runway', 'Kling', 'Leonardo', 'CapCut'] as const

function FlowArrow() {
  return (
    <span
      className="text-[var(--v2-gold)]/70 text-sm sm:text-base shrink-0 select-none"
      aria-hidden
    >
      →
    </span>
  )
}

function ToolChip({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full border border-[var(--v2-border)] bg-black/30 px-3 py-1.5 text-xs text-[var(--v2-text-secondary)] hover:border-[var(--v2-gold)]/30 hover:text-[var(--v2-text-primary)] transition-colors duration-200">
      {label}
    </span>
  )
}

function StepCard({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-5 sm:p-6 shadow-[0_0_40px_rgba(212,175,55,0.04)] hover:border-[var(--v2-gold)]/25 transition-colors duration-200">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--v2-gold)]/30 bg-[var(--v2-gold)]/5 text-[10px] tracking-[0.12em] font-medium text-[var(--v2-gold)]">
        {step}
      </span>
      <h3 className="mt-3 font-display text-lg text-[var(--v2-text-primary)]">{title}</h3>
      <div className="mt-3 text-sm text-[var(--v2-text-secondary)] leading-relaxed">{children}</div>
    </article>
  )
}

export function WorkflowPositioningSection({ className }: { className?: string }) {
  return (
    <section className={cn('px-5 sm:px-6 py-20 sm:py-28', className)}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <p className="text-[10px] tracking-[0.35em] uppercase text-[var(--v2-gold)] mb-3">
            Your Workflow
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-[var(--v2-text-primary)]">
            How Mugtee Fits Into Your Workflow
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[var(--v2-text-secondary)] max-w-2xl mx-auto">
            Mugtee becomes your AI creative director before production begins.
          </p>
        </div>

        <div className="mb-14 rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-5 sm:p-8 shadow-[0_0_40px_rgba(212,175,55,0.04)] hover:border-[var(--v2-gold)]/20 transition-colors duration-200">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 sm:gap-x-3">
            {FLOW_STEPS.map((label, i) => (
              <span key={label} className="inline-flex items-center gap-2 sm:gap-3">
                <span className="rounded-lg border border-[var(--v2-border)] bg-black/30 px-3 py-1.5 text-[10px] sm:text-xs tracking-[0.14em] uppercase text-[var(--v2-text-primary)] hover:border-[var(--v2-gold)]/35 transition-colors duration-200">
                  {label}
                </span>
                {i < FLOW_STEPS.length - 1 ? <FlowArrow /> : null}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StepCard step={1} title="Enter your idea.">
            <p>Start with a concept, niche, or prompt—Mugtee shapes everything that follows.</p>
          </StepCard>

          <StepCard step={2} title="Mugtee generates:">
            <ul className="space-y-1.5">
              {MUGTEE_OUTPUTS.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-[var(--v2-gold)]" aria-hidden>
                    ·
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </StepCard>

          <StepCard step={3} title="Create using your preferred tools.">
            <p className="mb-3">Take Mugtee&apos;s outputs into the tools you already use.</p>
            <div className="flex flex-wrap gap-2">
              {TOOL_CHIPS.map((tool) => (
                <ToolChip key={tool} label={tool} />
              ))}
            </div>
          </StepCard>

          <StepCard step={4} title="Publish to your audience.">
            <p>Ship finished content to the platforms where your audience already lives.</p>
          </StepCard>
        </div>
      </div>
    </section>
  )
}
