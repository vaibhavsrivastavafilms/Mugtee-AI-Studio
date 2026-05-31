'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { NICHES } from '@/components/ai/viral-studio-panel'
import {
  CREATOR_CONTENT_STYLES,
  CREATOR_PLATFORMS,
  saveCreatorMemoryProfile,
  type CreatorMemoryProfile,
} from '@/lib/creator/creator-memory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const CREATOR_GOALS = [
  { id: 'consistency', label: 'Stay consistent' },
  { id: 'grow', label: 'Grow audience' },
  { id: 'authority', label: 'Build authority' },
  { id: 'monetize', label: 'Monetize' },
  { id: 'learn', label: 'Learn the pipeline' },
] as const

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
] as const

type FormState = {
  creatorName: string
  primaryPlatform: string
  niche: string
  creatorGoal: string
  contentStyle: string
  experience: string
}

const EMPTY_FORM: FormState = {
  creatorName: '',
  primaryPlatform: '',
  niche: 'general',
  creatorGoal: 'consistency',
  contentStyle: '',
  experience: '',
}

function formFromProfile(profile: CreatorMemoryProfile): FormState {
  return {
    creatorName: profile.creatorName ?? '',
    primaryPlatform: profile.primaryPlatform ?? '',
    niche: profile.niche ?? 'general',
    creatorGoal: profile.creatorGoal ?? 'consistency',
    contentStyle: profile.contentStyle ?? '',
    experience: profile.experience ?? '',
  }
}

function isFormComplete(form: FormState): boolean {
  return Boolean(
    form.creatorName.trim() &&
      form.primaryPlatform &&
      form.niche &&
      form.creatorGoal &&
      form.contentStyle &&
      form.experience
  )
}

export function CreatorProfileOnboardingModal({
  open,
  initialProfile,
  onComplete,
}: {
  open: boolean
  initialProfile?: CreatorMemoryProfile
  onComplete: (profile: CreatorMemoryProfile) => void
}) {
  const [form, setForm] = useState<FormState>(() =>
    initialProfile ? formFromProfile(initialProfile) : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)

  const update = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormComplete(form)) {
      toast.error('Please fill in every field so Mugtee can personalize your studio.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/creator-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_profile: {
            creatorName: form.creatorName.trim(),
            primaryPlatform: form.primaryPlatform,
            niche: form.niche,
            creatorGoal: form.creatorGoal,
            contentStyle: form.contentStyle,
            experience: form.experience,
          },
        }),
      })

      if (res.status === 409) {
        const saved = await saveCreatorMemoryProfile({
          creatorName: form.creatorName.trim(),
          primaryPlatform: form.primaryPlatform,
          niche: form.niche,
          creatorGoal: form.creatorGoal,
          contentStyle: form.contentStyle,
          experience: form.experience,
        })
        onComplete(saved)
        toast.success('Creator profile saved')
        return
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? 'Could not save profile')
      }

      const data = (await res.json()) as { creator_profile?: CreatorMemoryProfile }
      const saved = data.creator_profile ?? {
        creatorName: form.creatorName.trim(),
        primaryPlatform: form.primaryPlatform,
        niche: form.niche,
        creatorGoal: form.creatorGoal,
        contentStyle: form.contentStyle,
        experience: form.experience,
      }
      onComplete(saved)
      toast.success('Welcome — Mugtee knows your lane now.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="creator-onboarding-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={cn(
              'w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto',
              'rounded-t-2xl sm:rounded-2xl border border-gold-500/25',
              'bg-[#0a0a0a]/98 shadow-2xl shadow-black/60'
            )}
          >
            <div className="p-5 sm:p-6 border-b border-white/[0.06]">
              <div className="flex items-start gap-3">
                <MugteeOrb state="idle" size={40} useLogo className="shrink-0" />
                <div>
                  <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75 mb-1">
                    Creator setup
                  </p>
                  <h2
                    id="creator-onboarding-title"
                    className="font-display text-xl text-luxe leading-snug"
                  >
                    Tell Mugtee who you are
                  </h2>
                  <p className="text-xs text-luxe/55 mt-1.5 leading-relaxed">
                    One quick setup — your brief, hooks, and recommendations adapt to your lane.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] tracking-wider uppercase text-luxe/45">
                  Creator name
                </label>
                <Input
                  value={form.creatorName}
                  onChange={(e) => update({ creatorName: e.target.value })}
                  placeholder="How should Mugtee greet you?"
                  className="bg-white/[0.03] h-10"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-wider uppercase text-luxe/45">
                    Platform
                  </label>
                  <Select
                    value={form.primaryPlatform}
                    onValueChange={(v) => update({ primaryPlatform: v })}
                  >
                    <SelectTrigger className="bg-white/[0.03] h-10">
                      <SelectValue placeholder="Primary platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATOR_PLATFORMS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-wider uppercase text-luxe/45">Niche</label>
                  <Select value={form.niche} onValueChange={(v) => update({ niche: v })}>
                    <SelectTrigger className="bg-white/[0.03] h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NICHES.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-wider uppercase text-luxe/45">Goal</label>
                  <Select
                    value={form.creatorGoal}
                    onValueChange={(v) => update({ creatorGoal: v })}
                  >
                    <SelectTrigger className="bg-white/[0.03] h-10">
                      <SelectValue placeholder="What are you building toward?" />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATOR_GOALS.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-wider uppercase text-luxe/45">
                    Content style
                  </label>
                  <Select
                    value={form.contentStyle}
                    onValueChange={(v) => update({ contentStyle: v })}
                  >
                    <SelectTrigger className="bg-white/[0.03] h-10">
                      <SelectValue placeholder="Your format" />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATOR_CONTENT_STYLES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] tracking-wider uppercase text-luxe/45">
                  Experience level
                </label>
                <Select value={form.experience} onValueChange={(v) => update({ experience: v })}>
                  <SelectTrigger className="bg-white/[0.03] h-10">
                    <SelectValue placeholder="Your level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={saving || !isFormComplete(form)}
                className="w-full bg-gold-gradient text-black font-semibold tracking-wide hover:opacity-90"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start creating with Mugtee
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
