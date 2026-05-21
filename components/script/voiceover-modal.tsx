'use client'
// MUGTEE V2.1 — Voiceover Script Document modal.
//
// Two-step flow:
//   Step 1: Mugtee drafts a *voiceover-ready* version of the script (paused, breathy,
//           narration tone) using the existing AI gateway in mode='rewrite_selection'
//           with variant='documentary'. The user can edit the narration freely.
//   Step 2: User clicks [Convert to Voice]. We POST /api/ai/voice which either
//           ElevenLabs-renders an MP3 (when key configured) or falls back to browser TTS.
//
// EXTREME LOW CREDIT MODE: no new deps. Reuses existing AI route + dialog + use-voice.

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Mic2, Volume2, Wand2, Pause, Play } from 'lucide-react'
import { useSpeechSynthesis, VOICE_PROFILE_META, type VoiceProfile } from '@/lib/use-voice'
import { toast } from 'sonner'
import { logEvent } from '@/lib/log-event'
import { rememberWorkspace } from '@/lib/last-workspace'
import { track } from '@/lib/posthog'
import { cn } from '@/lib/utils'

export function VoiceoverModal({
  open,
  onOpenChange,
  projectId,
  scriptSource,
  scriptTitle,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  scriptSource: string
  scriptTitle?: string
  onCreated?: () => void
}) {
  const [draft, setDraft] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [converting, setConverting] = useState(false)
  const tts = useSpeechSynthesis()

  // When modal opens, ask Mugtee for a voiceover-ready draft (or seed with source).
  useEffect(() => {
    if (!open) { setDraft(''); return }
    setDraft(scriptSource || '')
  }, [open, scriptSource])

  const refineForNarration = async () => {
    if (drafting) return
    setDrafting(true)
    try {
      const r = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'rewrite_selection',
          context: { selection: scriptSource || draft, rewrite_variant: 'documentary', full_script: scriptSource },
        }),
      })
      const d = await r.json()
      if (!r.ok || d?.error) { toast.error(d?.error || 'Refine failed'); return }
      const text = String(d.output || d.raw || '').trim()
      if (text) setDraft(text)
      toast.success('Narration draft ready')
    } catch (e: any) { toast.error(e?.message || 'Network error') }
    finally { setDrafting(false) }
  }

  const convert = async () => {
    const text = draft.trim()
    if (!text) { toast.error('Narration is empty'); return }
    if (text.length > 4500) { toast.error('Keep narration under 4500 characters'); return }
    setConverting(true)
    try {
      const r = await fetch('/api/ai/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, script: text }),
      })
      const d = await r.json()
      if (!r.ok || d?.error) { toast.error(d?.error || 'Voice generation failed'); return }
      if (d?.fallback === 'browser') {
        toast.success('Saved to project · playing via browser TTS')
        tts.speak(text)
      } else {
        toast.success('✨ MP3 voiceover saved')
      }
      // V3.5 — Creator Memory: log voiceover generation for the project timeline.
      logEvent({
        event_type: 'voiceover_generated',
        project_id: projectId,
        target: scriptTitle,
        metadata: { engine: d?.fallback || 'elevenlabs', word_count: text.split(/\s+/).filter(Boolean).length },
      })
      rememberWorkspace(projectId, scriptTitle, { stage: 'voiceover', last_event: 'voiceover_generated' })
      // V4.0 — Product analytics.
      track('voice_generated', {
        engine:     d?.fallback || 'elevenlabs',
        profile:    tts.profile,
        word_count: text.split(/\s+/).filter(Boolean).length,
      })
      onCreated?.()
      onOpenChange(false)
    } catch (e: any) { toast.error(e?.message || 'Network error') }
    finally { setConverting(false) }
  }

  const preview = () => {
    if (tts.speaking) { tts.stop(); return }
    if (!draft.trim()) { toast.error('Type a narration first'); return }
    tts.speak(draft)
  }

  const wordCount = draft.trim().split(/\s+/).filter(Boolean).length
  const charCount = draft.length
  const overLimit = charCount > 4500

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2.5"><Mic2 className="w-5 h-5 text-gold-300" /> Voiceover Script</DialogTitle>
          <p className="text-[12px] text-luxe/65 leading-relaxed">
            Edit the narration before converting it to voice. Trim pauses, sharpen rhythm, swap weak lines — the AI hears what you type.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold-300">Narration draft</span>
            <Button onClick={refineForNarration} disabled={drafting} variant="ghost" className="h-8 px-2.5 text-[11px] text-gold-300 hover:text-gold-200 hover:bg-gold-500/10 gap-1.5 min-h-[36px]">
              {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              {drafting ? 'Refining…' : 'Refine for narration'}
            </Button>
          </div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type or paste the narration as it should be read aloud…"
            className="w-full min-h-[280px] sm:min-h-[320px] rounded-xl bg-white/[0.03] border border-white/[0.06] focus:border-gold-500/40 focus:outline-none p-3.5 text-[13px] leading-relaxed text-luxe placeholder:text-muted-foreground/60 font-mono"
          />
          <div className="flex items-center justify-between text-[10px] tracking-wider text-muted-foreground">
            <span>{wordCount} words · <span className={overLimit ? 'text-rose-300' : ''}>{charCount}/4500 chars</span></span>
            <span>Tip: line break = pause</span>
          </div>

          {/* V3.8 — Voice profile picker (browser-native multi-speaker). Pure CSS pills,
              zero new deps. Each profile maps to a curated voice candidate list inside
              lib/use-voice. Preview button uses the selected profile. */}
          {tts.supported && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] tracking-[0.3em] uppercase text-gold-300 inline-flex items-center gap-1.5">
                  <Mic2 className="w-3 h-3" /> Speaker
                </span>
                <span className="text-[9.5px] tracking-wider text-muted-foreground">{VOICE_PROFILE_META[tts.profile]?.description}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VOICE_PROFILE_META) as VoiceProfile[]).map(key => {
                  const m = VOICE_PROFILE_META[key]
                  const active = tts.profile === key
                  return (
                    <button
                      key={key}
                      onClick={() => tts.setProfile(key)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-full text-[11px] tracking-wide border transition',
                        active
                          ? 'bg-gold-500/15 border-gold-500/45 text-gold-200'
                          : 'bg-white/[0.03] border-white/[0.06] text-luxe/80 hover:border-gold-500/35 hover:text-gold-200'
                      )}
                      title={`${m.label} \u00B7 ${m.lang}`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-white/[0.05]">
          <Button onClick={preview} variant="ghost" className="h-10 px-3 text-xs text-luxe/80 hover:text-gold-300 hover:bg-white/5 gap-1.5 min-h-[44px]">
            {tts.speaking ? <><Pause className="w-3.5 h-3.5" /> Stop preview</> : <><Volume2 className="w-3.5 h-3.5" /> Preview (browser)</>}
          </Button>
          <Button onClick={convert} disabled={converting || overLimit || !draft.trim()} className="h-10 px-5 text-xs bg-gold-gradient text-black shadow-gold-glow hover:opacity-90 gap-1.5 min-h-[44px]">
            {converting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Converting…</> : <><Mic2 className="w-3.5 h-3.5" /> Convert to Voice</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
