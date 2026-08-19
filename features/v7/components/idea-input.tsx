'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { AuthRequiredPrompt } from '@/components/auth/auth-required-prompt'
import { cn } from '@/lib/utils'
import type { V7RapidBrief } from '@/types/v7/production'

function isAuthRequiredResponse(status: number, message: string): boolean {
  if (status === 401 || status === 403) return true
  return /sign in|sign-in|logged in|authentication|unauthorized|not signed in/i.test(message)
}

const EXAMPLE =
  'Create a 45-second cinematic restaurant advertisement for Table Tales during monsoon.'

const DURATION_OPTIONS = ['15 sec', '30 sec', '45 sec', '60 sec', 'Custom', 'Let Mugtee decide'] as const
const VISUAL_STYLE_OPTIONS = [
  'Cinematic',
  'Photorealistic',
  'Commercial / Advertising',
  '3D',
  'Animated',
  'Documentary',
  'Anime',
  'Stylized',
  'Minimal / Premium',
  'Vintage / Retro',
  'Surreal',
  'Handcrafted / Stop-motion',
  'Let Mugtee decide',
] as const
const COLOR_OPTIONS = [
  'Full colour',
  'Black & white',
  'Warm cinematic',
  'Cool cinematic',
  'High contrast',
  'Desaturated',
  'Vibrant',
  'Brand colours',
  'Let Mugtee decide',
] as const
const VOICE_OPTIONS = ['Yes', 'No', 'Let Mugtee decide'] as const
const VOICE_STYLE_OPTIONS = [
  'Narrator',
  'Character',
  'Conversational',
  'Documentary',
  'Commercial',
  'Dramatic',
  'Minimal',
] as const
const MUSIC_OPTIONS = ['No music', 'AI-generated music', 'Upload custom music', 'Let Mugtee decide'] as const
const MUSIC_MOOD_OPTIONS = [
  'Epic',
  'Emotional',
  'Inspirational',
  'Dark',
  'Energetic',
  'Luxury',
  'Suspense',
  'Playful',
  'Minimal',
  'Romantic',
  'Futuristic',
  'Corporate',
] as const
const MOOD_OPTIONS = [
  'Powerful',
  'Emotional',
  'Inspirational',
  'Premium',
  'Luxury',
  'Energetic',
  'Mysterious',
  'Dark',
  'Funny',
  'Warm',
  'Nostalgic',
  'Adventurous',
  'Romantic',
  'Futuristic',
  'Peaceful',
  'Urgent',
  'Dramatic',
] as const
const EDITING_OPTIONS = [
  'Fast cuts',
  'Slow cinematic',
  'Music-driven',
  'Story-driven',
  'Dialogue-driven',
  'Product-focused',
  'Social-media reel',
  'Documentary pacing',
  'Trailer style',
  'Minimal premium',
] as const
const CAMERA_OPTIONS = [
  'Handheld',
  'Smooth gimbal',
  'Static compositions',
  'Drone / aerial',
  'Macro',
  'Product close-ups',
  'Long lens',
  'Wide cinematic',
  'Mixed / AI decides',
] as const
const ENDING_OPTIONS = [
  'Product hero shot',
  'Logo reveal',
  'Call to action',
  'Emotional ending',
  'Cinematic fade-out',
  'Dialogue ending',
  'AI decides',
] as const

type RapidBriefDraft = {
  duration: string
  visualStyle: string[]
  colorTreatment: string
  voiceover: 'yes' | 'no' | 'auto'
  voiceStyle: string
  musicMode: 'none' | 'ai' | 'custom' | 'auto'
  musicMood: string
  mood: string[]
  editingStyle: string
  cameraStyle: string
  ending: string
  brandingAssets: 'yes' | 'no'
  smartPromptFocus: string
}

const DEFAULT_DRAFT: RapidBriefDraft = {
  duration: 'Let Mugtee decide',
  visualStyle: ['Cinematic'],
  colorTreatment: 'High contrast',
  voiceover: 'auto',
  voiceStyle: 'Narrator',
  musicMode: 'auto',
  musicMood: 'Energetic',
  mood: ['Premium'],
  editingStyle: 'Product-focused',
  cameraStyle: 'Mixed / AI decides',
  ending: 'Call to action',
  brandingAssets: 'no',
  smartPromptFocus: '',
}

function keywordPromptQuestion(prompt: string): { title: string; options: string[] } | null {
  const lower = prompt.toLowerCase()
  if (/(shoe|sneaker|footwear|product|advertis|commercial)/.test(lower)) {
    return {
      title: 'Main selling point',
      options: ['Speed', 'Comfort', 'Durability', 'Lightweight', 'Style', 'Your own'],
    }
  }
  if (/(documentary|history|historical|event)/.test(lower)) {
    return {
      title: 'Documentary approach',
      options: ['Historical documentary', 'Emotional human story', 'Investigative', 'Cinematic recreation'],
    }
  }
  if (/(food|restaurant|meal|dish)/.test(lower)) {
    return {
      title: 'Food advertisement focus',
      options: ['Food close-ups', 'Chef preparation', 'Restaurant experience', 'Customer reaction', 'Product packaging'],
    }
  }
  return null
}

function toRapidBriefPayload(draft: RapidBriefDraft): V7RapidBrief {
  return {
    duration: draft.duration,
    visualStyle: draft.visualStyle,
    colorTreatment: draft.colorTreatment,
    voiceover: draft.voiceover,
    voiceStyle: draft.voiceover === 'yes' ? draft.voiceStyle : null,
    musicMode: draft.musicMode,
    musicMood: draft.musicMode === 'ai' ? draft.musicMood : null,
    mood: draft.mood,
    editingStyle: draft.editingStyle,
    cameraStyle: draft.cameraStyle,
    ending: draft.ending,
    brandingAssets: draft.brandingAssets,
    smartPromptFocus: draft.smartPromptFocus || null,
  }
}

export function V7IdeaInput({
  className,
  onProductionCreated,
}: {
  className?: string
  onProductionCreated?: (productionId: string) => void
}) {
  const router = useRouter()
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const [showBrief, setShowBrief] = useState(false)
  const [brief, setBrief] = useState<RapidBriefDraft>(DEFAULT_DRAFT)

  async function submit() {
    const trimmed = idea.trim()
    if (trimmed.length < 8 || loading) return

    setLoading(true)
    setError(null)
    setAuthRequired(false)

    try {
      const res = await fetch('/api/v7/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: trimmed, rapidBrief: toRapidBriefPayload(brief) }),
      })
      const data = (await res.json()) as {
        productionId?: string
        success?: boolean
        message?: string
        error?: string | { message?: string }
      }

      if (!res.ok || !data.productionId) {
        const msg =
          typeof data.message === 'string' && data.message
            ? data.message
            : typeof data.error === 'string'
              ? data.error
              : data.error?.message ?? 'Could not start production.'
        if (isAuthRequiredResponse(res.status, msg)) {
          setAuthRequired(true)
          setError('Sign in to create a film in Mugtee Studio.')
          setLoading(false)
          return
        }
        throw new Error(msg)
      }

      onProductionCreated?.(data.productionId)
      router.push(`/studio/${data.productionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start production.')
      setLoading(false)
    }
  }

  const smartPrompt = keywordPromptQuestion(idea)
  const askCameraStyle = !/social-media reel|minimal premium/i.test(brief.editingStyle)
  const askMusicMood = brief.musicMode === 'ai'
  const askVoiceStyle = brief.voiceover === 'yes'

  const quickPlanRows = [
    ['Prompt', idea.trim()],
    ['Duration', brief.duration],
    ['Visual style', brief.visualStyle.join(', ')],
    ['Colour', brief.colorTreatment],
    ['Voice', askVoiceStyle ? `${brief.voiceover} (${brief.voiceStyle})` : brief.voiceover],
    ['Music', askMusicMood ? `${brief.musicMode} (${brief.musicMood})` : brief.musicMode],
    ['Mood', brief.mood.join(', ')],
    ['Editing', brief.editingStyle],
    ['Camera', brief.cameraStyle],
    ['Ending', brief.ending],
  ].filter(([, value]) => Boolean(value))

  return (
    <div className={cn('mx-auto flex w-full max-w-3xl flex-col items-center px-4', className)}>
      <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-[#D4AF37]/80">
        Mugtee Production OS
      </p>
      <h1 className="text-center font-display text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
        One idea. One film.
      </h1>
      <p className="mt-4 max-w-xl text-center text-base text-white/60 sm:text-lg">
        Describe your idea. Mugtee researches, writes, directs, animates, and exports — autonomously.
      </p>

      <div className="mt-10 w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/90 p-1 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={4}
          placeholder={EXAMPLE}
          className="w-full resize-none rounded-xl bg-transparent px-5 py-4 text-base text-white placeholder:text-white/30 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void submit()
            }
          }}
        />
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
          <p className="text-xs text-white/40">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[#D4AF37]/70" aria-hidden />
            Ctrl+Enter to start
          </p>
          <button
            type="button"
            disabled={idea.trim().length < 8 || loading}
            onClick={() => {
              setError(null)
              setAuthRequired(false)
              setShowBrief(true)
            }}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#D4AF37] px-8 text-sm font-semibold text-[#0B0B0B] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              'Build Creative Plan'
            )}
          </button>
        </div>
      </div>

      {authRequired ? (
        <AuthRequiredPrompt
          className="mt-6 w-full max-w-md"
          message={error ?? 'Sign in to create a film in Mugtee Studio.'}
          returnPath="/studio"
        />
      ) : error ? (
        <p className="mt-4 text-center text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="mt-6 text-sm text-white/45 hover:text-[#E6C76A] hover:underline"
        onClick={() => setIdea(EXAMPLE)}
      >
        Try the example
      </button>

      {showBrief ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4">
          <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Rapid Creative Brief</h3>
              <button
                type="button"
                onClick={() => setShowBrief(false)}
                className="rounded-md border border-white/20 px-3 py-1 text-xs text-white/70"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-sm text-white/60">Answer only what matters. Mugtee will infer the rest.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-white/70">
                Duration
                <select
                  value={brief.duration}
                  onChange={(e) => setBrief((prev) => ({ ...prev, duration: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/70">
                Colour treatment
                <select
                  value={brief.colorTreatment}
                  onChange={(e) => setBrief((prev) => ({ ...prev, colorTreatment: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                >
                  {COLOR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/70 md:col-span-2">
                Visual style (pick up to 3)
                <div className="mt-2 flex flex-wrap gap-2">
                  {VISUAL_STYLE_OPTIONS.map((opt) => {
                    const active = brief.visualStyle.includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setBrief((prev) => {
                            if (active) return { ...prev, visualStyle: prev.visualStyle.filter((item) => item !== opt) }
                            if (prev.visualStyle.length >= 3) return prev
                            return { ...prev, visualStyle: [...prev.visualStyle, opt] }
                          })
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs',
                          active ? 'border-[#D4AF37]/60 bg-[#D4AF37]/20 text-[#F5DC8A]' : 'border-white/15 text-white/70'
                        )}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </label>

              <label className="text-sm text-white/70">
                Voice-over
                <select
                  value={brief.voiceover}
                  onChange={(e) => setBrief((prev) => ({ ...prev, voiceover: e.target.value as RapidBriefDraft['voiceover'] }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                >
                  <option value="yes">{VOICE_OPTIONS[0]}</option>
                  <option value="no">{VOICE_OPTIONS[1]}</option>
                  <option value="auto">{VOICE_OPTIONS[2]}</option>
                </select>
              </label>

              {askVoiceStyle ? (
                <label className="text-sm text-white/70">
                  Voice style
                  <select
                    value={brief.voiceStyle}
                    onChange={(e) => setBrief((prev) => ({ ...prev, voiceStyle: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                  >
                    {VOICE_STYLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="text-sm text-white/70">
                Music
                <select
                  value={brief.musicMode}
                  onChange={(e) => setBrief((prev) => ({ ...prev, musicMode: e.target.value as RapidBriefDraft['musicMode'] }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                >
                  <option value="none">{MUSIC_OPTIONS[0]}</option>
                  <option value="ai">{MUSIC_OPTIONS[1]}</option>
                  <option value="custom">{MUSIC_OPTIONS[2]}</option>
                  <option value="auto">{MUSIC_OPTIONS[3]}</option>
                </select>
              </label>

              {askMusicMood ? (
                <label className="text-sm text-white/70">
                  Music mood
                  <select
                    value={brief.musicMood}
                    onChange={(e) => setBrief((prev) => ({ ...prev, musicMood: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                  >
                    {MUSIC_MOOD_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="text-sm text-white/70">
                Editing style
                <select
                  value={brief.editingStyle}
                  onChange={(e) => setBrief((prev) => ({ ...prev, editingStyle: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                >
                  {EDITING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              {askCameraStyle ? (
                <label className="text-sm text-white/70">
                  Camera style
                  <select
                    value={brief.cameraStyle}
                    onChange={(e) => setBrief((prev) => ({ ...prev, cameraStyle: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                  >
                    {CAMERA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="text-sm text-white/70">
                Ending
                <select
                  value={brief.ending}
                  onChange={(e) => setBrief((prev) => ({ ...prev, ending: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                >
                  {ENDING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/70 md:col-span-2">
                Audience mood (pick up to 2)
                <div className="mt-2 flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((opt) => {
                    const active = brief.mood.includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setBrief((prev) => {
                            if (active) return { ...prev, mood: prev.mood.filter((item) => item !== opt) }
                            if (prev.mood.length >= 2) return prev
                            return { ...prev, mood: [...prev.mood, opt] }
                          })
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs',
                          active ? 'border-[#D4AF37]/60 bg-[#D4AF37]/20 text-[#F5DC8A]' : 'border-white/15 text-white/70'
                        )}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </label>

              <label className="text-sm text-white/70">
                Branding assets available
                <select
                  value={brief.brandingAssets}
                  onChange={(e) => setBrief((prev) => ({ ...prev, brandingAssets: e.target.value as 'yes' | 'no' }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              {smartPrompt ? (
                <label className="text-sm text-white/70">
                  {smartPrompt.title}
                  <select
                    value={brief.smartPromptFocus}
                    onChange={(e) => setBrief((prev) => ({ ...prev, smartPromptFocus: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                  >
                    <option value="">Let Mugtee decide</option>
                    {smartPrompt.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]/80">Your Video Plan</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {quickPlanRows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</dt>
                    <dd className="text-sm text-white/85">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBrief(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80"
              >
                Change answers later
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void submit()}
                className="rounded-lg bg-[#D4AF37] px-5 py-2 text-sm font-semibold text-[#0B0B0B] disabled:opacity-50"
              >
                {loading ? 'Starting…' : 'Start Production'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
