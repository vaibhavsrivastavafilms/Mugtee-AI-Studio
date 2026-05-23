'use client'
// MUGTEE UNIFIED CREATOR STUDIO — single cinematic ChatGPT-style entry point.
//
// MASTER EXECUTION mandate (single workflow, zero duplication):
//   • Replaces the old split-hero "ViralQuickStart" panel and the floating MugteeAssistant.
//   • One centered conversational input drives EVERY generator (viral, faceless, script,
//     storyboard, hooks, documentary).
//   • Mic + Mugtee Orb + Upload live INSIDE the input. Orb states map to voice / AI lifecycle.
//   • Quick-action chips live below the input — each is a soft preset, not a new modal.
//   • Inline contextual panels (DNA, Deep Research, Reference) expand IN PLACE — never overlay.
//   • All existing hooks (useViralIdeas, useSpeechRecognition, useSpeechSynthesis), intent
//     matcher, Faceless/Planner dialogs and Idea rendering are REUSED — no new orchestrators.
//
// V3.7 — Greeting is personalised with the signed-in creator's name ("What are we
// creating today, Aakash?"). Resolves from a lightweight /api/profile lookup with
// localStorage cache so we never block the hero render on a network call.
//
// The legacy export name `ViralQuickStart` is preserved so /dashboard imports keep working.

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Loader2, Wand2, Brain, Settings2, Flame, Video, Film, Mic, MicOff,
  Quote, BookOpen, Headphones, Pause, Play, Square, Paperclip, ArrowUp, Search,
  Compass, ChevronDown
} from 'lucide-react'
import { useSpeechRecognition, useSpeechSynthesis } from '@/lib/use-voice'
import { matchIntent } from '@/lib/voice-intents'
import { MUGTEE_LOADING_LINES, MUGTEE_SPEAK_LINES, pick } from '@/lib/mugtee-copy'
import { MugteeOrb, type OrbState } from '@/components/mugtee/mugtee-orb'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLATFORM_META } from '@/lib/dummy-data'
import { useViralIdeas, IdeaCard, TONES, NICHES, AUDIENCES, placeholderForNiche } from '@/components/ai/viral-studio-panel'
import { WeeklyPlannerDialog } from '@/components/ai/weekly-planner-dialog'
import { FacelessStudioDialog } from '@/components/ai/faceless-studio-dialog'
import { UpgradeModal } from '@/lib/usage'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type InlinePanel = null | 'dna' | 'research' | 'reference'

export function ViralQuickStart() {
  const v        = useViralIdeas()
  const router   = useRouter()
  const tts      = useSpeechSynthesis()
  const [panel,        setPanel]        = useState<InlinePanel>(null)
  const [plannerOpen,  setPlannerOpen]  = useState(false)
  const [facelessOpen, setFacelessOpen] = useState(false)

  // V3.7 — Personalised greeting. Tries a fast localStorage cache first so the
  // hero never flickers, then upgrades from /api/profile in the background.
  // Falls back gracefully to a neutral heading when we don't know the user yet.
  const [firstName, setFirstName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try { return localStorage.getItem('mugtee:user-firstname:v1') } catch { return null }
  })
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/profile', { cache: 'no-store' })
        const d = await r.json()
        const raw: string = d?.profile?.full_name || d?.profile?.name || d?.user?.email || ''
        const first = (raw.includes('@') ? raw.split('@')[0] : raw.split(' ')[0]).trim()
        if (first && !cancelled) {
          // Title-case for the hero (e.g. "aakash" → "Aakash").
          const tc = first.charAt(0).toUpperCase() + first.slice(1)
          setFirstName(tc)
          try { localStorage.setItem('mugtee:user-firstname:v1', tc) } catch {}
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  // ─── Voice layer (reused, untouched) ──────────────────────────
  const stt = useSpeechRecognition({
    onResult: (text, isFinal) => {
      if (!text) return
      v.setTopic(text)
      if (!isFinal) return
      const intent = matchIntent(text)
      switch (intent.kind) {
        case 'stop_speaking':    tts.stop(); return
        case 'open_latest':      tts.speak(pick(MUGTEE_SPEAK_LINES.openingProject)); router.push('/media'); return
        case 'generate_hooks':
        case 'generate_script':
          if (intent.topic) v.setTopic(intent.topic)
          tts.speak(pick(MUGTEE_SPEAK_LINES.generatingScript))
          setTimeout(() => v.generate(), 250)
          return
        case 'rewrite':
        case 'storyboard':
        case 'export':
        case 'read_aloud':
          tts.speak('Open a script first — then say it again.')
          return
      }
    },
  })

  // ─── Cinematic rotating loading copy ──────────────────────────
  const [loadingLine, setLoadingLine] = useState(MUGTEE_LOADING_LINES[0])
  useEffect(() => {
    if (!v.loading) return
    let i = 0
    setLoadingLine(MUGTEE_LOADING_LINES[Math.floor(Math.random() * MUGTEE_LOADING_LINES.length)])
    const id = setInterval(() => {
      i = (i + 1) % MUGTEE_LOADING_LINES.length
      setLoadingLine(MUGTEE_LOADING_LINES[i])
    }, 2400)
    return () => clearInterval(id)
  }, [v.loading])

  // ─── Auto-prefill from query params (New Project → ?topic=…&autorun=1) ─
  const searchParams = useSearchParams()
  const firedRef = useRef(false)
  const welcomeFiredRef = useRef(false)
  useEffect(() => {
    // V4.1 — signup_completed fires when the auth callback redirects with ?welcome=1.
    // Strip the param after firing so a manual reload doesn't double-count.
    if (welcomeFiredRef.current) return
    if (searchParams?.get('welcome') === '1') {
      welcomeFiredRef.current = true
      // Lazy import to avoid SSR pull-in
      import('@/lib/posthog').then(m => m.track('signup_completed', { provider: 'google' })).catch(() => {})
      try {
        const u = new URL(window.location.href)
        u.searchParams.delete('welcome')
        window.history.replaceState({}, '', u.toString())
      } catch {}
    }
  }, [searchParams])
  useEffect(() => {
    if (firedRef.current) return
    const topic    = searchParams?.get('topic')
    const niche    = searchParams?.get('niche')
    const platform = searchParams?.get('platform')
    const tone     = searchParams?.get('tone')
    const autorun  = searchParams?.get('autorun') === '1'
    if (!topic) return
    firedRef.current = true
    v.setTopic(topic)
    if (niche)    v.setNiche(niche)
    if (platform) v.setPlatform(platform as Platform)
    if (tone)     v.setTone(tone)
    if (autorun)  setTimeout(() => v.generate(), 350)
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Orb state derivation ─────────────────────────────────────
  const orbState: OrbState =
    stt.listening ? 'listening' :
    v.loading     ? 'thinking'  :
    tts.speaking  ? 'speaking'  : 'idle'

  const topThree = v.ideas.slice(0, 3)
  const togglePanel = (p: InlinePanel) => setPanel(prev => (prev === p ? null : p))

  // ─── Upload (reference image / asset) — lightweight stub that
  //     drops the filename into the prompt so the AI prompt picks it up.
  const fileRef = useRef<HTMLInputElement | null>(null)
  const onUpload = () => fileRef.current?.click()
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    v.setTopic((t) => (t ? `${t} (reference: ${f.name})` : `Reference style: ${f.name}`) as any)
    toast.success(`Reference attached: ${f.name}`)
    e.target.value = ''
  }

  // ─── Cinematic platform-relevance helpers (used by chip presets) ─
  const cinematicTones = useMemo(
    () => ['cinematic_emotional', 'storytelling', 'documentary'],
    []
  )
  const cinematicMode = cinematicTones.includes(String(v.tone))

  // V2.0 — the old CHIPS array (Viral Reel · Documentary · Hook · Faceless · Research ·
  // Cinematic Script · DNA · Plan Week) has been retired in favour of the InlineSuggestions
  // component below. Underlying handlers (faceless, planner, panel, platform, tone, generate)
  // are still wired — the suggestion strip now triggers them contextually based on what the
  // creator is typing.

  return (
    <>
      {/* ════════════════════════════════════════════════════════════
          UNIFIED CINEMATIC HERO — centered ChatGPT-style studio.
          One input. One workflow. One AI presence (Mugtee Orb).
          ════════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-3xl mx-auto"
      >
        {/* Top label */}
        <div className="text-center text-[10px] sm:text-[11px] tracking-[0.38em] uppercase text-gold-300/80 inline-flex items-center justify-center gap-2 w-full">
          <Sparkles className="w-3 h-3" /> Mugtee AI Studio
        </div>

        {/* Heading + sub */}
        <h1 className="mt-4 text-center font-display leading-[1.05] text-[2.1rem] sm:text-[2.8rem] lg:text-[3.2rem]">
          <span className="block text-foreground">What are we</span>
          <span className="block text-gold-gradient">
            creating today{firstName ? <span className="text-foreground/90">, {firstName}</span> : ''}?
          </span>
        </h1>
        <p className="mt-3 text-center text-[13px] sm:text-[14px] text-luxe/70 max-w-xl mx-auto leading-relaxed">
          Turn one idea into a cinematic production pipeline — script, storyboard, voiceover, export.
        </p>

        {/* ─── Centered conversational input ─── */}
        <div className="mt-7 relative">
          {/* Soft gold aura behind input */}
          <div aria-hidden className="absolute -inset-4 rounded-[28px] bg-gold-gradient opacity-[0.08] blur-2xl pointer-events-none" />

          <div className={cn(
            'relative rounded-2xl border bg-white/[0.035] backdrop-blur-xl transition shadow-cinema',
            stt.listening ? 'border-amber-300/60 ring-2 ring-amber-300/25'
                          : v.loading ? 'border-amber-400/40 ring-2 ring-amber-400/15'
                          : 'border-white/[0.08] hover:border-gold-500/40 focus-within:border-gold-500/50 focus-within:ring-2 focus-within:ring-gold-500/20'
          )}>
            <div className="flex items-end gap-2 sm:gap-3 p-2.5 sm:p-3.5">
              {/* LEFT — Upload */}
              <button
                type="button"
                onClick={onUpload}
                aria-label="Attach reference"
                title="Attach a reference image, script or asset"
                className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-luxe/80 hover:text-gold-200 hover:bg-gold-500/10 hover:border-gold-500/40 transition"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,text/plain,application/pdf" onChange={onFile} />

              {/* CENTER — text input */}
              <div className="flex-1 min-w-0">
                <textarea
                  id="mugtee-main-input"
                  value={v.topic}
                  onChange={(e) => v.setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !v.loading) {
                      e.preventDefault()
                      if (v.topic.trim()) v.generate()
                    }
                  }}
                  placeholder={stt.listening
                    ? 'Listening… speak naturally'
                    : 'Describe the story, reel, documentary or scene you want to create…'
                  }
                  rows={1}
                  className="w-full bg-transparent resize-none text-[14px] sm:text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none py-2 px-1 max-h-32"
                  style={{ minHeight: 40 }}
                />
                {/* Live interim hint */}
                {stt.listening && stt.interim && (
                  <div className="px-1 text-[11px] text-amber-200/70 italic truncate">&ldquo;{stt.interim}&rdquo;</div>
                )}
                {!stt.listening && v.loading && (
                  <div className="px-1 text-[11px] tracking-wider text-gold-300/90 inline-flex items-center gap-1.5">
                    <Sparkles className="w-2.5 h-2.5" /> {loadingLine}
                  </div>
                )}
              </div>

              {/* RIGHT — Mic + Orb + Send */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {stt.supported && (
                  <button
                    type="button"
                    onClick={stt.toggle}
                    disabled={v.loading}
                    aria-label={stt.listening ? 'Stop listening' : 'Speak your idea'}
                    title={stt.listening ? 'Stop listening' : 'Speak your idea'}
                    className={cn(
                      'w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-xl border transition',
                      stt.listening
                        ? 'bg-amber-500/20 border-amber-300/60 text-amber-200 shadow-[0_0_22px_-4px_rgba(245,196,77,0.6)]'
                        : 'bg-white/[0.04] border-white/[0.08] text-luxe/80 hover:text-gold-200 hover:bg-gold-500/10 hover:border-gold-500/40'
                    )}
                  >
                    {stt.listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}

                {/* The Orb — Mugtee's AI presence inside the chatbot */}
                <div className="hidden sm:flex items-center justify-center pointer-events-none">
                  <MugteeOrb state={orbState} size={36} />
                </div>

                {/* Send */}
                <button
                  type="button"
                  onClick={() => v.topic.trim() && v.generate()}
                  disabled={v.loading || !v.topic.trim()}
                  aria-label="Generate"
                  title="Generate (Enter)"
                  className="w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-xl bg-gold-gradient text-black shadow-gold-glow disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition"
                >
                  {v.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── V2.0 — Inline AI suggestions ─────────────────────────
            Replaces the old 8-chip floating toolbar with predictive inline pills
            that morph between starter ideas (empty input) and keyword-matched
            intents (typing). Underlying chip handlers are preserved 1:1 — these
            pills are just a smarter, calmer surface over the same actions. */}
        <InlineSuggestions
          topic={v.topic}
          activePanel={panel}
          onIntent={(intent) => {
            // 1) "Inline-panel" intents (DNA / Research) just toggle the existing panel.
            if (intent.panel) { setPanel(intent.panel); return }
            // 2) Faceless / Planner dialogs open in place.
            if (intent.faceless) { setFacelessOpen(true); return }
            if (intent.planner)  { setPlannerOpen(true);  return }
            // 3) Workspace handoff — for storyboard/frames-driven intents we send the
            //    creator into /workspace pre-filled. Reuses the workspace ?topic= deep-link.
            if (intent.workspace) {
              const url = v.topic.trim()
                ? `/workspace?topic=${encodeURIComponent(v.topic.trim())}`
                : '/workspace'
              router.push(url)
              return
            }
            // 4) Standard one-tap intent: set platform + tone, then generate (or focus).
            if (intent.platform) v.setPlatform(intent.platform as Platform)
            if (intent.tone)     v.setTone(intent.tone as any)
            if (v.topic.trim()) { v.generate(); return }
            document.getElementById('mugtee-main-input')?.focus()
          }}
        />

        {/* ─── Inline contextual panels (DNA / Research / Reference) ─── */}
        <AnimatePresence initial={false}>
          {panel && (
            <motion.div
              key={panel}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="rounded-2xl border border-gold-500/20 bg-white/[0.025] backdrop-blur-xl p-4 sm:p-5 shadow-cinema">
                {panel === 'dna' && (
                  <>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80 mb-3 inline-flex items-center gap-1.5">
                      <Brain className="w-3 h-3" /> Creator DNA · powers every AI output
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <DnaField label="Niche">
                        <Select value={v.niche} onValueChange={v.setNiche}>
                          <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{NICHES.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </DnaField>
                      <DnaField label="Audience">
                        <Select value={v.audience} onValueChange={v.setAudience}>
                          <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{AUDIENCES.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </DnaField>
                      <DnaField label="Platform">
                        <Select value={v.platform} onValueChange={(p) => v.setPlatform(p as Platform)}>
                          <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(PLATFORM_META).map(([k, val]) => <SelectItem key={k} value={k}>{val.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </DnaField>
                      <DnaField label="Tone">
                        <Select value={v.tone} onValueChange={v.setTone}>
                          <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{TONES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </DnaField>
                    </div>
                    {cinematicMode && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gold-500/[0.08] border border-gold-500/30 text-[9.5px] tracking-[0.25em] uppercase text-gold-300">
                        <Sparkles className="w-2.5 h-2.5" /> Cinematic signature mode
                      </div>
                    )}
                  </>
                )}
                {panel === 'research' && (
                  <>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80 mb-2 inline-flex items-center gap-1.5">
                      <Search className="w-3 h-3" /> Deep Research · inline context
                    </div>
                    <p className="text-[13px] text-luxe/85 leading-relaxed">
                      Type the topic above and Mugtee will gather the strongest hooks, statistics, references and competing angles before drafting your script. Hit <span className="text-gold-300">Generate</span> to start — research runs as a pre-pass.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {['Trending hooks', 'Competitor angles', 'Verified stats', 'Source citations'].map(t => (
                        <span key={t} className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10.5px] tracking-wide text-luxe/70">{t}</span>
                      ))}
                    </div>
                  </>
                )}
                {panel === 'reference' && (
                  <>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80 mb-2 inline-flex items-center gap-1.5">
                      <Paperclip className="w-3 h-3" /> Reference Analyzer
                    </div>
                    <p className="text-[13px] text-luxe/85">Attach any image, script or video via the paperclip — Mugtee uses it as a stylistic reference.</p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Results inline (idea cards) ─── */}
        <AnimatePresence>
          {(v.loading || topThree.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-6"
            >
              {!v.loading && topThree.length > 0 && tts.supported && (
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Top 3 ideas</span>
                  {tts.speaking ? (
                    <div className="inline-flex items-center gap-0.5">
                      {tts.paused ? (
                        <button onClick={tts.resume} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gold-500/15 border border-gold-500/40 text-gold-200 hover:bg-gold-500/25 text-[11px] transition">
                          <Play className="w-3 h-3" /> Resume
                        </button>
                      ) : (
                        <button onClick={tts.pause} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gold-500/15 border border-gold-500/40 text-gold-200 hover:bg-gold-500/25 text-[11px] transition">
                          <Pause className="w-3 h-3" /> Pause
                        </button>
                      )}
                      <button onClick={tts.stop} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-luxe text-[11px] transition">
                        <Square className="w-3 h-3" /> Stop
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const script = topThree.map((idea: any, i: number) => {
                          const title = idea?.title || idea?.headline || ''
                          const hook  = idea?.hook  || idea?.description || ''
                          return `Idea ${i + 1}. ${title}. ${hook}`.trim()
                        }).filter(Boolean).join('   ')
                        if (script) tts.speak(script)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 hover:border-gold-500/60 text-gold-300 hover:text-gold-200 text-[11px] transition"
                    >
                      <Headphones className="w-3.5 h-3.5" /> Hear Narration
                    </button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {v.loading ? (
                  [0,1,2].map(i => (
                    <div key={i} className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.05] animate-pulse">
                      <div className="h-3 w-3/4 bg-white/[0.06] rounded mb-2" />
                      <div className="h-2.5 w-1/2 bg-white/[0.04] rounded mb-3" />
                      <div className="h-6 w-full bg-white/[0.04] rounded" />
                    </div>
                  ))
                ) : topThree.map((idea, i) => (
                  <IdeaCard
                    key={i} idea={idea} index={i}
                    compact
                    isAdded={!!v.addedIds[i]} isAdding={v.adding === i}
                    scriptBusy={v.scriptBusy === i} scriptText={v.scripts[i]}
                    onAdd={() => v.addToPipeline(idea, i)}
                    onPromote={() => v.promoteToScript(idea, i)}
                  />
                ))}
              </div>
              {!v.loading && v.ideas.length > 3 && (
                <div className="mt-3 text-center text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                  Showing 3 of {v.ideas.length}. Full studio in <a href="/pipeline" className="text-gold-300 hover:text-gold-200">Pipeline</a>.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Reused dialogs (untouched) */}
      <WeeklyPlannerDialog open={plannerOpen}  onOpenChange={setPlannerOpen} />
      <FacelessStudioDialog open={facelessOpen} onOpenChange={setFacelessOpen} />
      <UpgradeModal open={v.upgradeOpen} onOpenChange={v.setUpgradeOpen} reason={v.upgradeReason} />
    </>
  )
}

// Alias for clarity — same component, semantic export.
export const UnifiedCreatorStudio = ViralQuickStart

function DnaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

// =====================================================================
// V2.0 — INLINE AI SUGGESTIONS
// Replaces the old 8-chip floating toolbar. A single calm pill row that
// morphs between starter intents (empty input) and keyword-matched
// predictions (typing). Pure local matching — no API, no embeddings.
// =====================================================================

type SuggestionIntent = {
  panel?: InlinePanel
  faceless?: boolean
  planner?: boolean
  workspace?: boolean
  platform?: string
  tone?: string
}
type Suggestion = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]      // matched against the topic text (lowercased)
  intent: SuggestionIntent
  starter?: boolean       // shown when input is empty
  weight?: number         // higher = preferred when multiple intents tie
}

const SUGGESTION_LIB: Suggestion[] = [
  // Documentary / story
  { id: 'doc',  label: 'Documentary Script', icon: Mic,      keywords: ['documentary','doc','story','biography','life','journey','real','true story','interview'], intent: { faceless: true, platform: 'youtube', tone: 'documentary' }, starter: true, weight: 2 },
  // Viral reel
  { id: 'viral', label: 'Viral Reel Script', icon: Flame,    keywords: ['viral','trending','fyp','scroll','stop the scroll','reach','blow up','reel','short'], intent: { platform: 'instagram', tone: 'cinematic_emotional' }, starter: true, weight: 2 },
  // Cinematic / film
  { id: 'cine', label: 'Cinematic Script',   icon: BookOpen, keywords: ['cinematic','film','movie','noir','frame','shot','scene','cinematography'], intent: { platform: 'youtube', tone: 'storytelling' } },
  // Hook
  { id: 'hook', label: 'Hook Generator',     icon: Quote,    keywords: ['hook','opening','intro','first line','attention','curiosity','scroll-stopping'], intent: { platform: 'instagram', tone: 'funny_relatable' } },
  // Faceless
  { id: 'face', label: 'Faceless Studio',    icon: Film,     keywords: ['faceless','voiceover','narrator','no face','no camera','b-roll','b roll','narrate'], intent: { faceless: true, platform: 'youtube', tone: 'cinematic_emotional' }, starter: true, weight: 1 },
  // Research
  { id: 'res',  label: 'Deep Research',      icon: Search,   keywords: ['research','study','data','facts','statistics','deep dive','sources'], intent: { panel: 'research' } },
  // DNA
  { id: 'dna',  label: 'Tune Creator DNA',   icon: Settings2,keywords: ['niche','audience','tone','dna','identity','persona','brand','positioning'], intent: { panel: 'dna' } },
  // Plan Week
  { id: 'plan', label: 'Plan This Week',     icon: Compass,  keywords: ['week','calendar','plan','schedule','batch','consistency','content calendar'], intent: { planner: true }, starter: true, weight: 1 },
  // Workspace handoffs (Phase 2A)
  { id: 'frame',label: 'Generate Frames',    icon: Film,     keywords: ['frame','still','image','visual','storyboard','board','shot list','reference'], intent: { workspace: true } },
  { id: 'sb',   label: 'Build Storyboard',   icon: BookOpen, keywords: ['storyboard','board','shot','scene','sequence','beats'], intent: { workspace: true } },
  // Caption pack
  { id: 'cap',  label: 'Caption Pack',       icon: Quote,    keywords: ['caption','captions','hashtag','hashtags','ig','instagram caption'], intent: { platform: 'instagram', tone: 'funny_relatable' } },
  // Emotional hook (special)
  { id: 'emo',  label: 'Emotional Hook',     icon: Quote,    keywords: ['emotional','heartfelt','feel','feeling','loneliness','grief','nostalgia','memory'], intent: { platform: 'instagram', tone: 'cinematic_emotional' } },
]

function matchSuggestions(topic: string, limit = 4): Suggestion[] {
  const t = topic.trim().toLowerCase()
  if (!t) return SUGGESTION_LIB.filter(s => s.starter).slice(0, limit)

  // Score each suggestion: count of distinct keyword hits + weight bonus.
  const scored = SUGGESTION_LIB
    .map(s => {
      let score = 0
      for (const kw of s.keywords) {
        if (t.includes(kw)) score += kw.length > 6 ? 2 : 1 // longer keywords count more
      }
      score += s.weight || 0
      return { s, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    // Sensible fallback when nothing matches: starter set so the surface is never empty.
    return SUGGESTION_LIB.filter(s => s.starter).slice(0, limit)
  }
  return scored.slice(0, limit).map(x => x.s)
}

function InlineSuggestions({
  topic, activePanel, onIntent,
}: {
  topic: string
  activePanel: InlinePanel
  onIntent: (intent: SuggestionIntent) => void
}) {
  const suggestions = useMemo(() => matchSuggestions(topic, 4), [topic])
  if (suggestions.length === 0) return null
  const isEmpty = !topic.trim()
  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <p className="text-[10px] tracking-[0.28em] uppercase text-gold-400/55">
        {isEmpty ? 'Try one of these' : 'Mugtee suggests'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {suggestions.map(s => {
          const Icon = s.icon
          const active = s.intent.panel && activePanel === s.intent.panel
          return (
            <button
              key={s.id}
              onClick={() => onIntent(s.intent)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] sm:text-[11.5px] tracking-wide transition group',
                active
                  ? 'bg-gold-500/15 border-gold-500/50 text-gold-200'
                  : 'bg-white/[0.025] border-white/[0.06] hover:bg-gold-500/10 hover:border-gold-500/40 text-luxe/80 hover:text-gold-200'
              )}
            >
              <Icon className="w-3.5 h-3.5 text-gold-400/75 group-hover:text-gold-300" />
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

