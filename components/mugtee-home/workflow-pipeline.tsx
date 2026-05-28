'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Clapperboard,
  FileText,
  Lightbulb,
  Mic,
  Sparkles,
  Type,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STEP_ORDER,
  type WorkflowStep,
  useCinematicWorkflowStore,
} from '@/stores/cinematic-workflow-store'

const STEPS: { key: WorkflowStep; label: string; icon: typeof Lightbulb }[] = [
  { key: 'idea', label: 'Idea', icon: Lightbulb },
  { key: 'title', label: 'Title', icon: Type },
  { key: 'script', label: 'Script', icon: FileText },
  { key: 'scenes', label: 'Scenes', icon: Clapperboard },
  { key: 'voice', label: 'Voice', icon: Mic },
  { key: 'video', label: 'Video Export', icon: Video },
]

export const WorkflowPipeline = memo(function WorkflowPipeline() {
  const currentStep = useCinematicWorkflowStore((s) => s.currentStep)
  const completedSteps = useCinematicWorkflowStore((s) => s.completedSteps)
  const loading = useCinematicWorkflowStore((s) => s.loading)

  const activeIndex = STEP_ORDER.indexOf(currentStep)

  return (
    <section id="pipeline" className="relative px-5 sm:px-6 py-16 sm:py-20 border-t border-white/[0.04]">
      <div className="container max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10 sm:mb-12"
        >
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Production Pipeline
          </div>
          <h2 className="font-display text-2xl sm:text-3xl text-luxe">
            From idea to <span className="text-gold-gradient">exported MP4</span>
          </h2>
        </motion.div>

        <div className="relative overflow-x-auto scroll-touch pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
          <div className="flex items-start gap-0 min-w-[640px] sm:min-w-0 sm:justify-between">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const stepIndex = STEP_ORDER.indexOf(step.key)
              const isComplete = completedSteps.includes(step.key)
              const isActive = currentStep === step.key || (loading && activeIndex === stepIndex)
              const isPast = stepIndex < activeIndex || isComplete

              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    className="flex flex-col items-center gap-2 min-w-[72px]"
                  >
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-500',
                        isActive && loading && 'shimmer-cinematic border-gold-500/50 bg-gold-500/10',
                        isActive && !loading && 'border-gold-500/60 bg-gold-500/15 shadow-gold-glow',
                        isPast && !isActive && 'border-gold-500/30 bg-gold-500/5',
                        !isPast && !isActive && 'border-white/[0.08] bg-black/30'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors duration-300',
                          isActive || isPast ? 'text-gold-300' : 'text-luxe/40'
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-[10px] tracking-[0.18em] uppercase text-center',
                        isActive || isPast ? 'text-gold-300/90' : 'text-luxe/40'
                      )}
                    >
                      {step.label}
                    </span>
                  </motion.div>

                  {i < STEPS.length - 1 ? (
                    <div className="flex-1 h-px mx-1 sm:mx-2 mt-5 relative min-w-[24px]">
                      <div className="absolute inset-0 bg-white/[0.06]" />
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-500/60 to-gold-400/30"
                        initial={{ width: '0%' }}
                        animate={{
                          width: isPast || (isActive && i < activeIndex) ? '100%' : '0%',
                        }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
})
