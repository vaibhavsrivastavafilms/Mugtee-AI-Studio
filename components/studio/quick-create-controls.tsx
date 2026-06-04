'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Brain,
  Clock,
  Globe,
  Mic,
  Smartphone,
  Target,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import {
  loadContentLanguagePreference,
  saveContentLanguagePreference,
} from '@/lib/cinematic/content-languages'
import type { ElevenLabsVoiceOption } from '@/lib/ai/elevenlabs'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import {
  QUICK_AUDIENCE_OPTIONS,
  QUICK_DURATION_OPTIONS,
  QUICK_PLATFORM_OPTIONS,
  QUICK_TONE_OPTIONS,
  type QuickPlatformValue,
} from '@/lib/studio/quick-create-options'
import { CreativeSystemCompactField } from '@/components/studio/creative-system-compact-field'

type QuickCreateControlsProps = {
  duration: number
  platform: QuickPlatformValue
  onDurationChange: (seconds: number) => void
  onPlatformChange: (platform: QuickPlatformValue) => void
  className?: string
  disabled?: boolean
}

function CompactDropdown({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: typeof Clock
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-2.5 py-2',
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0 text-violet-300/70" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/40 truncate">{label}</p>
        {children}
      </div>
    </div>
  )
}

export function QuickCreateControls({
  duration,
  platform,
  onDurationChange,
  onPlatformChange,
  className,
  disabled,
}: QuickCreateControlsProps) {
  const style = useQuickCutGenerationStore((s) => s.style)
  const language = useQuickCutGenerationStore((s) => s.language)
  const contentBrief = useQuickCutGenerationStore((s) => s.contentBrief)
  const voiceName = useQuickCutGenerationStore((s) => s.voiceName)
  const elevenLabsVoiceId = useQuickCutGenerationStore((s) => s.elevenLabsVoiceId)
  const setSelectedElevenLabsVoice = useQuickCutGenerationStore((s) => s.setSelectedElevenLabsVoice)
  const ensureRecommendedElevenLabsVoice = useQuickCutGenerationStore(
    (s) => s.ensureRecommendedElevenLabsVoice
  )

  const [voices, setVoices] = useState<ElevenLabsVoiceOption[]>([])
  const [voicesLoading, setVoicesLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setVoicesLoading(true)
    fetch('/api/elevenlabs/voices')
      .then((r) => r.json())
      .then((data: { voices?: ElevenLabsVoiceOption[] }) => {
        if (!cancelled) setVoices(Array.isArray(data.voices) ? data.voices : [])
      })
      .catch(() => {
        if (!cancelled) setVoices([])
      })
      .finally(() => {
        if (!cancelled) setVoicesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!elevenLabsVoiceId && !voicesLoading) {
      void ensureRecommendedElevenLabsVoice()
    }
  }, [elevenLabsVoiceId, ensureRecommendedElevenLabsVoice, voicesLoading])

  const audienceValue =
    QUICK_AUDIENCE_OPTIONS.find((o) => contentBrief?.audience?.toLowerCase().includes(o.value))?.value ??
    'general'

  const setTone = useCallback((tone: string) => {
    useQuickCutGenerationStore.setState({ style: tone })
  }, [])

  const setLanguage = useCallback((code: ProjectLanguage) => {
    useQuickCutGenerationStore.setState({ language: code })
    saveContentLanguagePreference(code)
  }, [])

  const setAudience = useCallback((value: string) => {
    const label = QUICK_AUDIENCE_OPTIONS.find((o) => o.value === value)?.label ?? value
    const brief = useQuickCutGenerationStore.getState().contentBrief
    if (brief) {
      useQuickCutGenerationStore.setState({
        contentBrief: { ...brief, audience: label },
      })
    } else {
      useQuickCutGenerationStore.setState({
        contentBrief: {
          topic: useQuickCutGenerationStore.getState().prompt.slice(0, 200) || 'Reel',
          audience: label,
          platform: platform.replace('_', ' '),
          tone: style,
          coreNarrative: '',
          keyInsights: [],
          emotionalAngle: '',
          desiredOutcome: '',
          ctaDirection: '',
        },
      })
    }
  }, [platform, style])

  const selectTriggerClass =
    'h-7 border-0 bg-transparent p-0 text-xs text-luxe/90 focus:ring-0 shadow-none w-full'

  return (
    <div className={cn('space-y-2', className)}>
      <CreativeSystemCompactField className="border-white/[0.08] bg-black/40" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        <CompactDropdown icon={Clock} label="Duration">
          <Select
            value={String(duration)}
            onValueChange={(v) => onDurationChange(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CompactDropdown>

        <CompactDropdown icon={Smartphone} label="Platform">
          <Select
            value={platform}
            onValueChange={(v) => onPlatformChange(v as QuickPlatformValue)}
            disabled={disabled}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CompactDropdown>

        <CompactDropdown icon={Mic} label="Voice">
          <Select
            value={elevenLabsVoiceId ?? ''}
            onValueChange={(id) => {
              const v = voices.find((x) => x.voiceId === id)
              if (v) setSelectedElevenLabsVoice(v.voiceId, v.name)
            }}
            disabled={disabled || voicesLoading || voices.length < 1}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder={voicesLoading ? 'Loading…' : voiceName || 'Auto voice'} />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {voices.slice(0, 24).map((v) => (
                <SelectItem key={v.voiceId} value={v.voiceId}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CompactDropdown>

        <CompactDropdown icon={Globe} label="Language">
          <Select
            value={language || loadContentLanguagePreference()}
            onValueChange={(v) => setLanguage(v as ProjectLanguage)}
            disabled={disabled}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
            </SelectContent>
          </Select>
        </CompactDropdown>

        <CompactDropdown icon={Target} label="Target Audience">
          <Select value={audienceValue} onValueChange={setAudience} disabled={disabled}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_AUDIENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CompactDropdown>

        <CompactDropdown icon={Brain} label="Tone">
          <Select
            value={QUICK_TONE_OPTIONS.find((t) => t.value === style)?.value ?? style}
            onValueChange={setTone}
            disabled={disabled}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Tone" />
            </SelectTrigger>
            <SelectContent>
              {QUICK_TONE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CompactDropdown>
      </div>
    </div>
  )
}
