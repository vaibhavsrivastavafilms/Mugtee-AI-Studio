'use client'
// Phase V1.1 — cinematic "+ New Project" modal.
//
// Behaviour:
//   • Collects Project Name / Topic / Niche / Platform / Tone + optional voice input
//   • On submit → navigates to /dashboard with query params; the existing
//     ViralQuickStart hero auto-reads them and prefills the form.
//   • No new DB writes — "projects" in Mugtee = content_pieces (created lazily on first generate).
//   • Reuses NICHES / AUDIENCES + placeholderForNiche + voice hooks. Zero new deps.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Mic, MicOff, ArrowRight, Loader2 } from 'lucide-react'
import { NICHES, AUDIENCES, TONES, placeholderForNiche, readCreatorProfile } from '@/components/ai/viral-studio-panel'
import { PLATFORM_META } from '@/lib/dummy-data'
import { useSpeechRecognition } from '@/lib/use-voice'
import { cn } from '@/lib/utils'

export function NewProjectModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter()
  const [name,     setName]     = useState('')
  const [topic,    setTopic]    = useState('')
  const [niche,    setNiche]    = useState('general')
  const [platform, setPlatform] = useState<string>('instagram')
  const [tone,     setTone]     = useState<string>('cinematic_emotional')
  const [launching, setLaunching] = useState(false)

  // Seed from saved creator DNA on first open
  useEffect(() => {
    if (!open) return
    try {
      const p = readCreatorProfile()
      if (p.niche) setNiche(p.niche)
    } catch {}
  }, [open])

  const stt = useSpeechRecognition({
    onResult: (text) => { if (text) setTopic(text) },
  })

  const launch = () => {
    if (launching) return
    const trimmed = topic.trim()
    if (!trimmed) return
    setLaunching(true)
    // Persist working draft so the dashboard hero can rehydrate immediately.
    try {
      if (name.trim()) localStorage.setItem('mugtee:project:name', name.trim())
    } catch {}
    const qs = new URLSearchParams({ topic: trimmed, niche, platform, tone, autorun: '1' })
    router.push(`/dashboard?${qs.toString()}`)
    setTimeout(() => { setLaunching(false); onOpenChange(false) }, 600)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg border border-gold-soft">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
            <Sparkles className="w-3 h-3" /> New AI Project
          </div>
          <DialogTitle className="font-display text-2xl">
            What are we <span className="text-gold-gradient">creating</span>?
          </DialogTitle>
          <p className="text-[12px] text-luxe/65 leading-snug">One idea → full viral production pipeline.</p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="space-y-1">
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Project name (optional)</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cinematic Faceless Series — Episode 1" className="bg-white/[0.03] h-10" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1.5">
              <span>Topic</span>
              {stt.listening && <span className="normal-case text-[10px] text-rose-300 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" /> Listening…</span>}
            </label>
            <div className="relative">
              <Input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') launch() }}
                placeholder={placeholderForNiche(niche)}
                className={cn('bg-white/[0.03] h-10', stt.supported && 'pr-10', stt.listening && 'border-rose-500/50 ring-2 ring-rose-500/20 animate-pulse')}
              />
              {stt.supported && (
                <button
                  type="button"
                  onClick={stt.toggle}
                  aria-label={stt.listening ? 'Stop listening' : 'Speak your idea'}
                  className={cn(
                    'absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md transition',
                    stt.listening
                      ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-[0_0_14px_-2px_rgba(244,63,94,0.55)]'
                      : 'bg-white/[0.04] border border-white/[0.06] text-gold-300 hover:bg-gold-500/15 hover:border-gold-500/40',
                  )}
                >
                  {stt.listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Niche</label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{NICHES.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PLATFORM_META).map(([k, val]: any) => <SelectItem key={k} value={k}>{val.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{TONES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.05]">
          <Button
            onClick={launch}
            disabled={launching || !topic.trim()}
            className="w-full h-11 bg-gold-gradient text-black shadow-gold-glow gap-2 disabled:opacity-50"
          >
            {launching ? <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</> : <><Sparkles className="w-4 h-4" /> Launch Viral Finder <ArrowRight className="w-4 h-4" /></>}
          </Button>
          <div className="text-[10px] text-center text-muted-foreground mt-2">Mugtee will generate viral angles, hooks &amp; cinematic scripts for you.</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
