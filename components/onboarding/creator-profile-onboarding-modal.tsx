'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Building2,
  Clapperboard,
  Film,
  Heart,
  Instagram,
  Linkedin,
  Loader2,
  Megaphone,
  Mic2,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
  Youtube,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { MugteeSidekickAvatar } from '@/components/sidekick/mugtee-sidekick-avatar'
import {
  saveCreatorMemoryProfile,
  type CreatorMemoryProfile,
} from '@/lib/creator/creator-memory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TOTAL_STEPS = 6
const REDIRECT_PATH = '/studio'

type CardOption = {
  id: string
  label: string
  icon: LucideIcon
}

type StepDef = {
  question: string
  subtitle: string
  mode: 'intro' | 'text' | 'single' | 'multi' | 'final'
  placeholder?: string
  options?: CardOption[]
}

const STEPS: StepDef[] = [
  {
    question: "Hi. I've been waiting for someone creative.",
    subtitle: "I'm Mugtee. Not a tool. More like the imaginary friend who helps you finish the thing in your head.",
    mode: 'intro',
  },
  {
    question: "What's your name?",
    subtitle: "I want to remember what to call you when we're making something together.",
    mode: 'text',
    placeholder: 'Your name',
  },
  {
    question: 'What do you love creating?',
    subtitle: 'Pick the worlds you naturally drift toward.',
    mode: 'multi',
    options: [
      { id: 'video', label: 'Video', icon: Film },
      { id: 'photography', label: 'Photography', icon: Clapperboard },
      { id: 'business', label: 'Business', icon: Building2 },
      { id: 'food', label: 'Food', icon: Sparkles },
      { id: 'fashion', label: 'Fashion', icon: Megaphone },
      { id: 'music', label: 'Music', icon: Mic2 },
      { id: 'anything', label: 'Anything', icon: Rocket },
    ],
  },
  {
    question: 'How should I help you?',
    subtitle: 'Tell me the kind of friend you need.',
    mode: 'single',
    options: [
      { id: 'push_me', label: 'Push me', icon: TrendingUp },
      { id: 'challenge_me', label: 'Challenge me', icon: Target },
      { id: 'encourage_me', label: 'Encourage me', icon: Sparkles },
      { id: 'teach_me', label: 'Teach me', icon: Film },
      { id: 'keep_focused', label: 'Keep me focused', icon: Zap },
    ],
  },
  {
    question: "Choose Mugtee's personality.",
    subtitle: 'This changes the way I nudge, react, and help you think.',
    mode: 'single',
    options: [
      { id: 'calm', label: 'Calm', icon: Sparkles },
      { id: 'funny', label: 'Funny', icon: Zap },
      { id: 'bold', label: 'Bold', icon: Rocket },
      { id: 'energetic', label: 'Energetic', icon: TrendingUp },
      { id: 'thoughtful', label: 'Thoughtful', icon: Heart },
    ],
  },
  {
    question: "We're friends now.",
    subtitle: "Let's make something unforgettable.",
    mode: 'final',
  },
]

type SelectionState = {
  creatorName: string
  lovesCreating: string[]
  helpStyle: string | null
  personality: string | null
}

const EMPTY_SELECTION: SelectionState = {
  creatorName: '',
  lovesCreating: [],
  helpStyle: null,
  personality: null,
}

function buildProfileFromSelection(
  selection: SelectionState,
  skipped = false
): CreatorMemoryProfile {
  const lovesCreating =
    selection.lovesCreating.length > 0 ? selection.lovesCreating : ['anything']
  const helpStyle = selection.helpStyle ?? 'encourage_me'
  const personality = selection.personality ?? 'thoughtful'
  const creatorName = selection.creatorName.trim() || (skipped ? 'Creator' : 'Creator')

  return {
    creatorName,
    niche: lovesCreating[0] ?? 'general',
    primaryPlatform: 'multi',
    creatorGoal: helpStyle,
    contentStyle: lovesCreating.join(','),
    experience: personality,
    updatedAt: new Date().toISOString(),
  }
}

async function persistProfile(profile: CreatorMemoryProfile): Promise<CreatorMemoryProfile> {
  try {
    const res = await fetch('/api/creator-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_profile: profile }),
    })

    if (res.status === 409) {
      return saveCreatorMemoryProfile(profile)
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(data?.error ?? 'Could not save profile')
    }

    const data = (await res.json()) as { creator_profile?: CreatorMemoryProfile }
    return data.creator_profile ?? profile
  } catch {
    return saveCreatorMemoryProfile(profile)
  }
}

function SelectableCard({
  option,
  selected,
  onSelect,
}: {
  option: CardOption
  selected: boolean
  onSelect: () => void
}) {
  const Icon = option.icon
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-4 rounded-2xl border px-4 py-4 sm:py-5 text-left transition-all duration-300',
        'min-h-[72px] touch-manipulation active:scale-[0.99]',
        selected
          ? 'border-gold-500/70 bg-gold-500/[0.12] shadow-[0_0_32px_rgba(212,175,55,0.18)] ring-1 ring-gold-400/30'
          : 'border-white/[0.08] bg-white/[0.025] hover:border-gold-500/30 hover:bg-white/[0.04]'
      )}
      aria-pressed={selected}
    >
      <span
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors',
          selected
            ? 'border-gold-500/50 bg-gold-500/15 text-gold-200'
            : 'border-white/[0.08] bg-black/40 text-luxe/60'
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span
        className={cn(
          'font-medium text-base sm:text-lg tracking-tight',
          selected ? 'text-gold-100' : 'text-luxe/90'
        )}
      >
        {option.label}
      </span>
    </motion.button>
  )
}

export function CreatorProfileOnboardingModal({
  open,
  onComplete,
}: {
  open: boolean
  initialProfile?: CreatorMemoryProfile
  onComplete: (profile: CreatorMemoryProfile) => void
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<'questions' | 'adapting'>('questions')
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION)
  const [saving, setSaving] = useState(false)
  const [direction, setDirection] = useState(1)

  const currentStep = STEPS[step]

  const stepValue = useMemo(() => {
    switch (step) {
      case 1:
        return selection.creatorName
      case 2:
        return selection.lovesCreating
      case 3:
        return selection.helpStyle
      case 4:
        return selection.personality
      default:
        return null
    }
  }, [step, selection])

  const canContinue = useMemo(() => {
    if (currentStep.mode === 'intro' || currentStep.mode === 'final') return true
    if (currentStep.mode === 'text') return selection.creatorName.trim().length > 0
    if (currentStep.mode === 'multi') {
      return selection.lovesCreating.length > 0
    }
    return Boolean(stepValue)
  }, [currentStep.mode, selection.creatorName, selection.lovesCreating.length, stepValue])

  const goNext = useCallback(() => {
    setDirection(1)
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))
  }, [])

  const finish = useCallback(
    async (skipped = false) => {
      if (saving) return
      setSaving(true)
      try {
        const profile = buildProfileFromSelection(selection, skipped)
        const saved = await persistProfile(profile)
        setPhase('adapting')
        onComplete(saved)
        window.setTimeout(() => {
          router.push(REDIRECT_PATH)
        }, 2400)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save profile')
        setSaving(false)
      }
    },
    [onComplete, router, saving, selection]
  )

  const handleContinue = () => {
    if (step >= TOTAL_STEPS - 1) {
      void finish(false)
      return
    }
    goNext()
  }

  const handleSkipStep = () => {
    if (step >= TOTAL_STEPS - 1) {
      void finish(true)
      return
    }
    goNext()
  }

  const handleSkipSetup = () => {
    void finish(true)
  }

  const handleSelect = (id: string) => {
    if (step === 2) {
      setSelection((s) => ({
        ...s,
        lovesCreating: s.lovesCreating.includes(id)
          ? s.lovesCreating.filter((x) => x !== id)
          : [...s.lovesCreating, id],
      }))
    } else if (step === 3) setSelection((s) => ({ ...s, helpStyle: id }))
    else if (step === 4) setSelection((s) => ({ ...s, personality: id }))
  }

  const isSelected = (id: string) => {
    if (step === 2) return selection.lovesCreating.includes(id)
    return stepValue === id
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black"
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-onboarding-title"
      >
        {/* Cinematic backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.15), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(212,175,55,0.06), transparent)',
          }}
        />

        {phase === 'adapting' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-8"
            >
              <MugteeSidekickAvatar size="lg" priority />
            </motion.div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-gold-300/80 mb-3">
              Remembering
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-luxe max-w-md leading-snug">
              Mugtee is learning how to be your creative friend
            </h2>
            <Loader2 className="mt-8 h-6 w-6 animate-spin text-gold-400/70" aria-hidden />
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <div className="relative z-10 shrink-0 border-b border-white/[0.06] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-6">
              <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MugteeSidekickAvatar size="sm" className="shrink-0" />
                  <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75 truncate">
                    Adopt Mugtee
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSkipSetup}
                  disabled={saving}
                  className="shrink-0 text-[11px] tracking-wide text-luxe/45 hover:text-gold-300/80 transition-colors py-2 px-1"
                >
                  Maybe later
                </button>
              </div>

              {/* Progress */}
              <div className="mx-auto mt-4 max-w-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] tracking-[0.22em] uppercase text-luxe/45">
                    Step {step + 1} of {TOTAL_STEPS}
                  </span>
                  <span className="text-[10px] text-luxe/35">
                    {Math.round(((step + 1) / TOTAL_STEPS) * 100)}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gold-600 to-amber-300"
                    initial={false}
                    animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </div>

            {/* Question + cards */}
            <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
              <div className="mx-auto max-w-lg">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    initial={{ opacity: 0, x: direction * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -40 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h2
                      id="creator-onboarding-title"
                      className="font-display text-2xl sm:text-3xl text-luxe leading-tight mb-2"
                    >
                      {currentStep.question}
                    </h2>
                    <p className="text-sm text-luxe/50 mb-6 leading-relaxed">
                      {currentStep.subtitle}
                    </p>

                    {currentStep.mode === 'text' ? (
                      <Input
                        value={selection.creatorName}
                        onChange={(e) =>
                          setSelection((s) => ({ ...s, creatorName: e.target.value }))
                        }
                        placeholder={currentStep.placeholder}
                        className="h-12 rounded-2xl border-white/[0.1] bg-white/[0.04] px-4 text-base text-luxe"
                      />
                    ) : currentStep.options?.length ? (
                      <div className="space-y-3">
                        {currentStep.options.map((option) => (
                          <SelectableCard
                            key={option.id}
                            option={option}
                            selected={isSelected(option.id)}
                            onSelect={() => handleSelect(option.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-gold-500/20 bg-gold-500/[0.06] p-5 text-sm leading-relaxed text-luxe/70">
                        Mugtee will remember your style, your clients, your favorite pacing, your
                        colors, your deadlines, and the stories you keep coming back to.
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer actions */}
            <div className="relative z-10 shrink-0 border-t border-white/[0.06] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <div className="mx-auto flex max-w-lg flex-col gap-3">
                <Button
                  type="button"
                  disabled={!canContinue || saving}
                  onClick={handleContinue}
                  className="w-full h-12 bg-gold-gradient text-black font-semibold tracking-wide hover:opacity-90 disabled:opacity-40"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : step >= TOTAL_STEPS - 1 ? (
                    <>
                      We&apos;re friends now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Let&apos;s keep going
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={handleSkipStep}
                  disabled={saving}
                  className="w-full py-2 text-sm text-luxe/45 hover:text-luxe/70 transition-colors"
                >
                  Skip this step
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
