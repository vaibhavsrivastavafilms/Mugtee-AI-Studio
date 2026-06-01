'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2, Mic, Volume2 } from 'lucide-react'
import {
  VOICE_CATEGORY_LABELS,
  type ElevenLabsVoiceCategory,
  type ElevenLabsVoiceOption,
} from '@/lib/ai/elevenlabs'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type VoicesResponse = {
  voices: ElevenLabsVoiceOption[]
  byCategory?: Partial<Record<ElevenLabsVoiceCategory, ElevenLabsVoiceOption[]>>
  categoryLabels?: Record<ElevenLabsVoiceCategory, string>
  defaultVoiceId?: string
  elevenlabsAvailable?: boolean
  allowElevenLabs?: boolean
  message?: string
}

const CATEGORY_ORDER: ElevenLabsVoiceCategory[] = [
  'documentary',
  'warm',
  'narrative',
  'calm',
  'deep',
  'other',
]

export function VoiceSelectionModule({ className }: { className?: string }) {
  const language = useQuickCutGenerationStore((s) => s.language)
  const elevenLabsVoiceId = useQuickCutGenerationStore((s) => s.elevenLabsVoiceId)
  const voiceName = useQuickCutGenerationStore((s) => s.voiceName)
  const voiceFallbackMessage = useQuickCutGenerationStore((s) => s.voiceFallbackMessage)
  const setSelectedElevenLabsVoice = useQuickCutGenerationStore((s) => s.setSelectedElevenLabsVoice)

  const [open, setOpen] = useState(false)
  const [voices, setVoices] = useState<ElevenLabsVoiceOption[]>([])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loadingVoices, setLoadingVoices] = useState(true)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingVoices(true)
    fetch('/api/elevenlabs/voices')
      .then((r) => r.json())
      .then((data: VoicesResponse) => {
        if (cancelled) return
        const list = Array.isArray(data.voices) ? data.voices : []
        setVoices(list)
        setStatusMessage(data.message ?? null)
        if (!elevenLabsVoiceId && list.length > 0) {
          const defaultId = data.defaultVoiceId || list[0].voiceId
          const pick = list.find((v) => v.voiceId === defaultId) ?? list[0]
          useQuickCutGenerationStore.setState({
            elevenLabsVoiceId: pick.voiceId,
            voiceName: pick.name,
          })
        }
      })
      .catch(() => {
        if (!cancelled) setStatusMessage('Could not load voice catalog.')
      })
      .finally(() => {
        if (!cancelled) setLoadingVoices(false)
      })
    return () => {
      cancelled = true
    }
  }, [elevenLabsVoiceId])

  const grouped = useMemo(() => {
    const map = new Map<ElevenLabsVoiceCategory, ElevenLabsVoiceOption[]>()
    for (const v of voices) {
      const list = map.get(v.category) ?? []
      list.push(v)
      map.set(v.category, list)
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      label: VOICE_CATEGORY_LABELS[c],
      voices: map.get(c)!,
    }))
  }, [voices])

  const playPreview = useCallback(
    async (voice: ElevenLabsVoiceOption) => {
      if (previewingId) return
      setPreviewingId(voice.voiceId)
      try {
        if (voice.previewUrl) {
          const audio = new Audio(voice.previewUrl)
          previewAudioRef.current = audio
          await audio.play()
          return
        }
        const res = await fetch('/api/elevenlabs/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceId: voice.voiceId, language }),
        })
        const data = (await res.json()) as { audioUrl?: string; error?: string }
        if (!res.ok || !data.audioUrl) {
          setStatusMessage(data.error || 'Preview unavailable')
          return
        }
        const audio = new Audio(data.audioUrl)
        previewAudioRef.current = audio
        await audio.play()
      } catch {
        setStatusMessage('Preview could not play')
      } finally {
        setPreviewingId(null)
      }
    },
    [language, previewingId]
  )

  const selectVoice = useCallback(
    (voice: ElevenLabsVoiceOption) => {
      setSelectedElevenLabsVoice(voice.voiceId, voice.name)
      setOpen(false)
      void playPreview(voice)
    },
    [playPreview, setSelectedElevenLabsVoice]
  )

  const currentLabel = voiceName || 'Choose narrator'
  const listboxId = useId()

  return (
    <div
      className={cn(
        'rounded-xl border border-gold-500/15 bg-gradient-to-b from-gold-500/[0.06] to-black/40 p-3',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/90">
          <Mic className="w-3 h-3" />
          Narrator
        </div>
        {loadingVoices ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-400/60" />
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {open ? (
          <button
            type="button"
            role="combobox"
            onClick={() => setOpen(false)}
            className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-black/50 px-3 py-2 text-left hover:border-gold-500/25 transition-colors"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-label="Choose narrator voice"
          >
            <span className="truncate text-sm text-[#F4E7C1]/95 font-medium">{currentLabel}</span>
            <ChevronDown className="w-4 h-4 shrink-0 text-gold-400/70 transition-transform rotate-180" />
          </button>
        ) : (
          <button
            type="button"
            role="combobox"
            onClick={() => setOpen(true)}
            className="flex-1 min-w-0 flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-black/50 px-3 py-2 text-left hover:border-gold-500/25 transition-colors"
            aria-expanded="false"
            aria-controls={listboxId}
            aria-haspopup="listbox"
            aria-label="Choose narrator voice"
          >
            <span className="truncate text-sm text-[#F4E7C1]/95 font-medium">{currentLabel}</span>
            <ChevronDown className="w-4 h-4 shrink-0 text-gold-400/70 transition-transform" />
          </button>
        )}
        {elevenLabsVoiceId ? (
          <button
            type="button"
            onClick={() => {
              const v = voices.find((x) => x.voiceId === elevenLabsVoiceId)
              if (v) void playPreview(v)
            }}
            disabled={Boolean(previewingId)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-500/25 bg-gold-500/10 text-gold-200 hover:bg-gold-500/15 transition-colors disabled:opacity-50"
            aria-label="Preview selected voice"
          >
            {previewingId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        ) : null}
      </div>

      {(statusMessage || voiceFallbackMessage) && (
        <p className="mt-2 text-[10px] text-luxe/50 leading-snug">
          {voiceFallbackMessage || statusMessage}
        </p>
      )}

      {open ? (
        <div
          id={listboxId}
          className="mt-3 max-h-[min(280px,40vh)] overflow-y-auto scrollbar-luxe rounded-lg border border-white/[0.06] bg-black/60 p-2 space-y-3"
          role="listbox"
          aria-label="ElevenLabs voices"
        >
          {grouped.map(({ category, label, voices: catVoices }) => (
            <div key={category} role="group" aria-label={label}>
              <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/60 px-1 mb-1.5">
                {label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {catVoices.map((voice) => {
                  const selected = voice.voiceId === elevenLabsVoiceId
                  const optionClassName = cn(
                    'w-full text-left rounded-md px-2.5 py-2 border transition-colors',
                    selected
                      ? 'border-gold-500/40 bg-gold-500/15 text-[#F4E7C1]'
                      : 'border-transparent bg-white/[0.03] text-luxe/85 hover:border-gold-500/20 hover:bg-gold-500/5'
                  )
                  return selected ? (
                    <button
                      key={voice.voiceId}
                      type="button"
                      role="option"
                      aria-selected="true"
                      onClick={() => selectVoice(voice)}
                      className={optionClassName}
                    >
                      <span className="text-[12px] font-medium block truncate">
                        {voice.name}
                      </span>
                      {voice.description ? (
                        <span className="text-[10px] text-luxe/45 line-clamp-1 block mt-0.5">
                          {voice.description}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <button
                      key={voice.voiceId}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => selectVoice(voice)}
                      className={optionClassName}
                    >
                      <span className="text-[12px] font-medium block truncate">
                        {voice.name}
                      </span>
                      {voice.description ? (
                        <span className="text-[10px] text-luxe/45 line-clamp-1 block mt-0.5">
                          {voice.description}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && !loadingVoices ? (
            <p className="text-[11px] text-luxe/50 text-center py-4">No voices available</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
