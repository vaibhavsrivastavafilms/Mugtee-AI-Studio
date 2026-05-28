'use client'

import { CinematicShimmer } from '@/components/cinematic/cinematic-states'
import { EXPORT_PROGRESS_STEPS } from '@/lib/cinematic/export-package'
import { getWorkflowPresenceLine } from '@/lib/creator/workflow-presence-copy'

export function ExportProgressPanel({
  activeStep,
  progress,
  presenceLine,
}: {
  activeStep: number
  progress: number
  presenceLine?: string
}) {
  const line = EXPORT_PROGRESS_STEPS[activeStep] ?? EXPORT_PROGRESS_STEPS[0]
  const emotionalLine = presenceLine || getWorkflowPresenceLine('exporting', activeStep)

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 sm:p-12 text-center max-w-xl mx-auto min-h-[360px] flex flex-col justify-center cinematic-stage-transition workflow-presence-glow">
      <CinematicShimmer className="w-12 h-12 rounded-full mx-auto mb-6" />
      <p className="font-display text-xl text-[#F4E7C1] italic mb-2">
        {emotionalLine}
      </p>
      <p className="text-sm text-white/45 mb-8">
        {line}…
      </p>

      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-[#8B6914] via-[#D4AF37] to-[#E7C56A] calm-opacity-transition"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="text-left space-y-2 max-w-xs mx-auto">
        {EXPORT_PROGRESS_STEPS.map((step, i) => (
          <li
            key={step}
            className={`text-xs tracking-wide calm-opacity-transition ${
              i <= activeStep ? 'text-[#C8A24E]/85' : 'text-white/25'
            }`}
          >
            {i < activeStep ? '✓' : i === activeStep ? '→' : '·'} {step}
          </li>
        ))}
      </ul>
    </section>
  )
}

