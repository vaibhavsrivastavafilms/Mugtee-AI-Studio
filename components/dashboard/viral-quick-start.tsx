'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Wand2, X, CalendarCheck, Brain, Settings2, Flame, Video, Film, Mic, Quote, BookOpen, MicOff, Headphones, Pause, Play, Square } from 'lucide-react'
import { useSpeechRecognition, useSpeechSynthesis } from '@/lib/use-voice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLATFORM_META } from '@/lib/dummy-data'
import { useViralIdeas, IdeaCard, TONES, NICHES, AUDIENCES, placeholderForNiche } from '@/components/ai/viral-studio-panel'
import { WeeklyPlannerDialog } from '@/components/ai/weekly-planner-dialog'
import { FacelessStudioDialog } from '@/components/ai/faceless-studio-dialog'
import { UpgradeModal } from '@/lib/usage'
import type { Platform } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ViralQuickStart() {
  const v = useViralIdeas()
  const [open, setOpen] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const [plannerOpen, setPlannerOpen] = useState(false)
  const [facelessOpen, setFacelessOpen] = useState(false)
  // Creator DNA panel — collapsed by default to keep the hero compact, but
  // opens when the user hits "DNA" so niche/audience/tone/platform are all
  // first-class dashboard controls (no more buried-in-Settings).
  const [dnaOpen, setDnaOpen] = useState(false)

  // ─── Voice-first layer ────────────────────────────────────────
  // Mic transcribes into the topic input — user manually clicks Generate (no auto-submit).
  // Hear Narration reads the AI ideas aloud once results render.
  const tts = useSpeechSynthesis()
  const stt = useSpeechRecognition({
    onResult: (text, isFinal) => {
      if (!text) return
      v.setTopic(text)   // live transcript fills the topic input
      // do NOT auto-submit — spec requires manual Generate click
    },
  })

  // Subtle scroll-collapse: auto-hide hero once user scrolls past ~140px
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 140)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const collapsed = scrolled && open
  const dismissed = !open

  // Show only the first 3 results on the hero (full panel lives in /pipeline)
  const topThree = v.ideas.slice(0, 3)

  return (
    <>
      {/* Floating reopen button (when user has explicitly closed) */}
      <AnimatePresence>
        {dismissed && (
          <motion.button
            initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:8}}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gold-gradient text-black text-xs font-semibold tracking-wide shadow-gold-glow hover:opacity-90 transition"
            aria-label="Open Mugtee quick start"
          >
            <Sparkles className="w-4 h-4" /> Mugtee
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {open && (
          <motion.section
            initial={{opacity:0, y:-8, height:'auto'}}
            animate={{opacity:1, y:0, height:'auto'}}
            exit={{opacity:0, y:-8}}
            transition={{type:'spring', damping:24, stiffness:180}}
            className={cn(
              'sticky top-20 z-20 glass border border-gold-soft rounded-2xl overflow-hidden transition-all',
              collapsed ? 'shadow-gold-glow' : 'shadow-cinema',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-white/[0.05]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center shrink-0 shadow-gold-glow">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
                    Mugtee AI Studio
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl lg:text-[2rem] mt-1 leading-tight">
                    What do you want to <span className="text-gold-gradient">create</span> today?
                  </h2>
                  <p className="text-[12px] sm:text-[13px] text-luxe/70 leading-snug mt-1.5 max-w-xl">
                    Generate faceless content, scripts, hooks, storyboards, and viral ideas instantly.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setDnaOpen(o => !o)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md border text-[11px] tracking-wide transition",
                    dnaOpen
                      ? "bg-gold-500/20 border-gold-500/50 text-gold-200"
                      : "bg-white/[0.03] border-white/[0.08] hover:bg-gold-500/10 hover:border-gold-500/30 text-luxe/80",
                  )}
                  aria-label="Creator DNA"
                  title="Niche · Audience · Tone · Platform — saved to your creator DNA"
                >
                  <Settings2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">DNA</span>
                </button>
                <button
                  onClick={() => setFacelessOpen(true)}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 hover:border-gold-500/60 text-gold-300 text-[11px] tracking-wide transition"
                  aria-label="Open Faceless AI Studio"
                  title="Faceless YouTube research, scripting & visual prompts"
                >
                  <Brain className="w-3.5 h-3.5" /> Faceless AI
                </button>
                <button
                  onClick={() => setFacelessOpen(true)}
                  className="md:hidden p-1.5 rounded-md bg-gold-500/10 border border-gold-500/30 text-gold-300 hover:bg-gold-500/20 transition"
                  aria-label="Open Faceless AI Studio"
                >
                  <Brain className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPlannerOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 hover:border-gold-500/60 text-gold-300 text-[11px] tracking-wide transition"
                  aria-label="Plan my week"
                  title="Plan a full week of content with AI"
                >
                  <CalendarCheck className="w-3.5 h-3.5" /> Plan Week
                </button>
                <button
                  onClick={() => setPlannerOpen(true)}
                  className="sm:hidden p-1.5 rounded-md bg-gold-500/10 border border-gold-500/30 text-gold-300 hover:bg-gold-500/20 transition"
                  aria-label="Plan my week"
                >
                  <CalendarCheck className="w-4 h-4" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-gold-300 transition" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Compact form — hides when scrolled-collapsed (unless no results yet) */}
            <AnimatePresence initial={false}>
              {(!collapsed || v.ideas.length === 0) && (
                <motion.div
                  initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}}
                  className="overflow-hidden"
                >
                  <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-[1fr_180px_180px_auto] gap-2.5 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1.5">
                        <span>Topic</span>
                        {stt.listening && (
                          <span className="inline-flex items-center gap-1 text-[10px] tracking-wider text-rose-300 normal-case">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" /> Mugtee is listening…
                          </span>
                        )}
                        {!stt.listening && v.loading && (
                          <span className="inline-flex items-center gap-1 text-[10px] tracking-wider text-gold-300 normal-case">
                            <Sparkles className="w-2.5 h-2.5" /> Building your cinematic concept…
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <Input
                          value={v.topic}
                          onChange={(e) => v.setTopic(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !v.loading) v.generate() }}
                          placeholder={placeholderForNiche(v.niche)}
                          className={
                            'bg-white/[0.03] focus-visible:ring-gold-500/40 focus-visible:border-gold-500/40 h-10 ' +
                            (stt.supported ? 'pr-10 ' : '') +
                            (stt.listening ? 'border-rose-500/50 ring-2 ring-rose-500/20 animate-pulse' : '')
                          }
                        />
                        {/* In-input gold mic — hidden gracefully if browser unsupported */}
                        {stt.supported && (
                          <button
                            type="button"
                            onClick={stt.toggle}
                            disabled={v.loading}
                            aria-label={stt.listening ? 'Stop listening' : 'Speak your idea'}
                            title={stt.listening ? 'Stop listening' : 'Tap and speak your idea'}
                            className={
                              'absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-md transition ' +
                              (stt.listening
                                ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-[0_0_14px_-2px_rgba(244,63,94,0.55)]'
                                : 'bg-white/[0.04] border border-white/[0.06] text-gold-300 hover:bg-gold-500/15 hover:border-gold-500/40 hover:text-gold-200 hover:shadow-[0_0_14px_-2px_rgba(245,196,77,0.5)]')
                            }
                          >
                            {stt.listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                      {/* Live interim transcript hint — non-blocking, gold tint */}
                      {stt.listening && stt.interim && (
                        <div className="text-[10px] text-gold-300/70 italic truncate pl-1">&ldquo;{stt.interim}&rdquo;</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Platform</label>
                      <Select value={v.platform} onValueChange={(p) => v.setPlatform(p as Platform)}>
                        <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PLATFORM_META).map(([k, val]) => <SelectItem key={k} value={k}>{val.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Tone</label>
                      <Select value={v.tone} onValueChange={v.setTone}>
                        <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TONES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={v.generate} disabled={v.loading || !v.topic.trim()}
                      className="h-10 bg-gold-gradient text-black gap-2 shadow-gold-glow hover:opacity-90 px-4">
                      {v.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {v.loading ? 'Generating…' : 'Generate'}
                    </Button>
                  </div>

                  {/* Quick-action chips — ChatGPT/Canva-style AI shortcuts.
                      Each chip is a soft preset: it nudges platform/tone toward the
                      most-effective combo for that format, then runs the same generate flow. */}
                  <div className="px-4 sm:px-5 pb-3 -mt-1">
                    <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Wand2 className="w-3 h-3 text-gold-400/70" /> Quick actions
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        { label: 'Viral Reel',         icon: Flame,    platform: 'instagram',          tone: 'cinematic_emotional' },
                        { label: 'YouTube Script',     icon: Video,    platform: 'youtube',            tone: 'storytelling' },
                        { label: 'Faceless Video',     icon: Film,     platform: 'youtube',            tone: 'cinematic_emotional', faceless: true },
                        { label: 'Storyboard',         icon: BookOpen, platform: v.platform,           tone: v.tone,                faceless: true },
                        { label: 'Hook Generator',     icon: Quote,    platform: v.platform,           tone: 'funny_relatable' },
                        { label: 'Documentary Script', icon: Mic,      platform: 'youtube',            tone: 'storytelling',        faceless: true },
                      ] as const).map(action => {
                        const Icon = action.icon
                        return (
                          <button
                            key={action.label}
                            onClick={() => {
                              v.setPlatform(action.platform as Platform)
                              v.setTone(action.tone as any)
                              if ((action as any).faceless) {
                                // Faceless workflows open the dedicated dialog (existing flow, not rebuilt)
                                setFacelessOpen(true)
                              } else if (v.topic.trim()) {
                                // Topic already typed → fire the same generate path
                                v.generate()
                              } else {
                                // No topic yet → focus the input so user can type one
                                const el = document.querySelector('input[placeholder^="e.g."]') as HTMLInputElement | null
                                el?.focus()
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-gold-500/10 border border-white/[0.06] hover:border-gold-500/40 text-luxe/80 hover:text-gold-200 text-[11px] tracking-wide transition group"
                          >
                            <Icon className="w-3 h-3 text-gold-400/70 group-hover:text-gold-300" />
                            {action.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Creator DNA — Niche + Audience inline.
                      Changes save instantly via setNiche/setAudience (writeCreatorProfile under the hood). */}
                  <AnimatePresence initial={false}>
                    {dnaOpen && (
                      <motion.div
                        initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}}
                        className="overflow-hidden border-t border-white/[0.05]"
                      >
                        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground inline-flex items-center gap-1.5">
                              <Brain className="w-3 h-3 text-gold-400/80" /> Niche
                              <span className="text-[9px] tracking-normal text-gold-300/70 normal-case ml-1">drives AI output</span>
                            </label>
                            <Select value={v.niche} onValueChange={v.setNiche}>
                              <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {NICHES.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground inline-flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-gold-400/80" /> Audience
                              <span className="text-[9px] tracking-normal text-gold-300/70 normal-case ml-1">saved automatically</span>
                            </label>
                            <Select value={v.audience} onValueChange={v.setAudience}>
                              <SelectTrigger className="bg-white/[0.03] h-10 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {AUDIENCES.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
              {(v.loading || topThree.length > 0) && (
                <motion.div
                  initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}}
                  className="overflow-hidden border-t border-white/[0.05]"
                >
                  {/* 🎧 Hear Narration — reads the 3 idea titles + hooks aloud. Hidden if TTS unsupported or still loading. */}
                  {!v.loading && topThree.length > 0 && tts.supported && (
                    <div className="px-4 sm:px-5 pt-3 -mb-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Top 3 ideas</span>
                      {tts.speaking ? (
                        <div className="inline-flex items-center gap-0.5">
                          {tts.paused ? (
                            <button onClick={tts.resume} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gold-500/15 border border-gold-500/40 text-gold-200 hover:bg-gold-500/25 text-[11px] tracking-wide transition">
                              <Play className="w-3 h-3" /> Resume
                            </button>
                          ) : (
                            <button onClick={tts.pause} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gold-500/15 border border-gold-500/40 text-gold-200 hover:bg-gold-500/25 text-[11px] tracking-wide transition">
                              <Pause className="w-3 h-3" /> Pause
                            </button>
                          )}
                          <button onClick={tts.stop} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-luxe hover:border-white/[0.18] text-[11px] tracking-wide transition">
                            <Square className="w-3 h-3" /> Stop
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            // Narrate ideas as a single cinematic read.
                            const script = topThree.map((idea: any, i: number) => {
                              const title = idea?.title || idea?.headline || ''
                              const hook  = idea?.hook  || idea?.description || ''
                              return `Idea ${i + 1}. ${title}. ${hook}`.trim()
                            }).filter(Boolean).join('   ')
                            if (script) tts.speak(script)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 hover:border-gold-500/60 text-gold-300 hover:text-gold-200 text-[11px] tracking-wide transition shadow-[0_0_14px_-4px_rgba(245,196,77,0.4)]"
                          title="Hear these ideas read aloud"
                        >
                          <Headphones className="w-3.5 h-3.5" /> Hear Narration
                        </button>
                      )}
                    </div>
                  )}
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    <div className="px-4 sm:px-5 pb-4 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      Showing 3 of {v.ideas.length}. Full studio in <a href="/pipeline" className="text-gold-300 hover:text-gold-200">Pipeline</a>.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty hint — only when no ideas + form visible */}
            {!v.loading && v.ideas.length === 0 && !collapsed && (
              <div className="px-4 sm:px-5 pb-4 -mt-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-1.5">
                <Wand2 className="w-3 h-3 text-gold-400/60" /> Type a topic + hit Generate
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Phase 12 — Weekly AI Content Planner */}
      <WeeklyPlannerDialog open={plannerOpen} onOpenChange={setPlannerOpen} />
      {/* Phase 13D — Faceless AI Studio */}
      <FacelessStudioDialog open={facelessOpen} onOpenChange={setFacelessOpen} />
      {/* Phase P2/P7 — usage cap upgrade + rewarded sponsor modal */}
      <UpgradeModal open={v.upgradeOpen} onOpenChange={v.setUpgradeOpen} reason={v.upgradeReason} />
    </>
  )
}
