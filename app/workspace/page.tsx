'use client'
// Mugtee Workspace — cinematic 3-panel creator workspace.
// Reuses existing shadcn/ui primitives + the Mugtee gold/luxe theme. Zero new deps.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { track } from '@/lib/posthog'
import {
  Sparkles, Plus, Loader2, FileText, Film, Image as ImageIcon,
  Zap, MessageCircle, Save, ChevronRight, Layers,
  Copy, Download, FileType, RefreshCw, MoreHorizontal,
  Home, PenLine, BookOpen, Mic, Settings as SettingsIcon, Compass,
} from 'lucide-react'

const PLATFORMS = [
  { value: 'instagram_reel', label: 'Instagram Reel' },
  { value: 'youtube_short',  label: 'YouTube Short' },
  { value: 'youtube_video',  label: 'YouTube Video' },
]
const TONES = [
  { value: 'cinematic',    label: 'Cinematic' },
  { value: 'emotional',    label: 'Emotional' },
  { value: 'funny',        label: 'Funny' },
  { value: 'motivational', label: 'Motivational' },
]
const DURATIONS = [
  { value: '30', label: '30 sec' },
  { value: '60', label: '60 sec' },
  { value: '90', label: '90 sec' },
]
const TEMPLATES = [
  { id: 'reel_hook',  label: 'Reel Hook',         seed: 'A 60-second hook-first reel that stops the scroll in 3 seconds.' },
  { id: 'doc_story',  label: 'Documentary Story', seed: 'A cinematic 90-second documentary-style narration with retention beats.' },
  { id: 'tutorial',   label: 'Mini Tutorial',     seed: 'A punchy 60-second how-to with a clear payoff in the first 3 seconds.' },
  { id: 'before_after', label: 'Before / After',  seed: 'A 30-second transformation reel with a strong contrast hook.' },
]

// Starter prompts — clicking auto-fills the topic textarea (does NOT auto-generate).
const STARTER_PROMPTS = [
  '90s monsoon reunion',
  'Why most creators quit',
  'Restaurant founder journey',
  'The table that remembers people',
  'A father teaching filmmaking',
]

// Static showcase — purely for inspiration/proof. No data, no carousel, no animation.
const SHOWCASE: { title: string; hook: string; platform: string }[] = [
  { title: 'Rain That Smelled Like Home',  hook: '"Some cities don\u2019t forget who waited for you."', platform: 'Instagram Reel' },
  { title: 'The Last Order',                hook: '"He cooked for 40 years. One plate stayed empty every Sunday."', platform: 'YouTube Short' },
  { title: 'Mornings With Aaji',            hook: '"She poured chai like she was pouring a story."', platform: 'Instagram Reel' },
  { title: 'The Camera That Knew My Father', hook: '"He never said he loved me. He filmed it instead."', platform: 'YouTube Short' },
]

type GenOutput = {
  hook: string
  script: string
  storyboard: string
  captions: string
  thumbnailIdea: string
}
type RecentProject = {
  id: string
  title: string
  platform: string
  status: string
  updated_at: string
}

// =====================================================================
// Phase 2F — Silent Language Normalization (client-side detection only).
// Lightweight Unicode-block + Hinglish-marker heuristic. No API call,
// no library. Used purely for telemetry; the LLM does the actual
// normalization silently inside the existing /api/generate-script call.
// =====================================================================
type DetectedLanguage = 'english' | 'hindi' | 'gujarati' | 'hinglish' | 'other'
// Hinglish markers — strictly Hindi-origin Romanized words. NO words that
// commonly appear in pure English creator prompts (e.g. "cinematic", "reel",
// "story"). We require >= 2 matches to bias away from false positives.
const HINGLISH_MARKERS = /\b(hai|hain|nahi|nahin|kya|kyun|kyo|mujhe|tujhe|tumhe|mera|meri|tera|teri|hamara|aapka|aapko|tumhara|tumko|hum|tum|aap|woh|wo|yeh|ye|aur|bhi|toh|kuch|sab|sabko|matlab|bhai|yaar|dost|dosti|banana|banao|banaye|banaiye|karna|karein|karenge|krna|chahiye|chahta|chahti|accha|achha|acha|theek|thik|bilkul|jaldi|jaroor|zaroor|abhi|insaan|zindagi|pyar|pyaar|mohabbat|dil|maa|baap|beta|beti|bachpan|yaadein|kahani|kahaani)\b/i

function detectInputLanguage(raw: string): DetectedLanguage {
  if (!raw) return 'english'
  const text = raw.trim()
  if (!text) return 'english'
  if (/[\u0900-\u097F]/.test(text)) return 'hindi'      // Devanagari
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gujarati'   // Gujarati
  // Non-ASCII characters that aren't covered above \u2192 'other'
  const hasNonAscii = /[^\x00-\x7F]/.test(text)
  if (hasNonAscii) return 'other'
  // ASCII-only \u2192 require 2+ Hinglish markers to bias away from false positives.
  const matches = (text.toLowerCase().match(new RegExp(HINGLISH_MARKERS, 'gi')) || []).length
  if (matches >= 2) return 'hinglish'
  return 'english'
}

export default function WorkspacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState(PLATFORMS[0].value)
  const [tone, setTone] = useState(TONES[0].value)
  const [duration, setDuration] = useState(DURATIONS[1].value)

  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState<GenOutput | null>(null)
  const [tab, setTab] = useState<'hook' | 'script' | 'storyboard' | 'captions' | 'thumbnail'>('hook')

  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [recents, setRecents] = useState<RecentProject[]>([])
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  // V1.10 — Payoff "magic moment": bumped on each successful generation/load so the
  // OutputPanel can scroll itself into view + apply a brief gold glow ring without
  // owning extra state about whether it was just generated.
  const [revealNonce, setRevealNonce] = useState(0)

  // ── Telemetry refs (avoid stale closures + unnecessary rerenders) ──
  const sessionStartedRef       = useRef(false)
  const sessionStartTsRef       = useRef<number>(Date.now())
  const usedStarterPromptRef    = useRef(false)
  const reopenedFromUrlRef      = useRef<boolean>(!!searchParams.get('project'))
  const hasOutputRef            = useRef(false)
  const hasUnsavedOutputRef     = useRef(false)
  const generateCountRef        = useRef(0)
  const saveCountRef            = useRef(0)
  useEffect(() => { hasOutputRef.current = !!output }, [output])
  useEffect(() => { hasUnsavedOutputRef.current = !!output && !savedId }, [output, savedId])

  // Load recent projects + emit session_started exactly once on first load.
  useEffect(() => {
    let alive = true
    fetch('/api/projects/recent').then(r => r.json()).then(d => {
      if (!alive) return
      const list = Array.isArray(d?.projects) ? d.projects.slice(0, 8) : []
      setRecents(list)
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true
        track('workspace_session_started', {
          authenticated: true, // route is auth-gated; if we got here we're signed in
          has_existing_projects: list.length > 0,
          existing_projects_count_bucket:
            list.length === 0 ? 'none' : list.length < 3 ? '1-2' : list.length < 8 ? '3-7' : '8+',
          source: searchParams.get('source') || undefined,
          deep_linked_project: reopenedFromUrlRef.current,
        })
      }
    }).catch(() => {})
    return () => { alive = false }
    // savedId in the dep array refreshes the list after save; session_started still fires once via the ref guard.
  }, [savedId, searchParams])

  // Lifecycle telemetry — capture abandonment + unsaved exits via pagehide (more reliable than beforeunload on mobile).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onLeave = () => {
      const dwellMs = Date.now() - sessionStartTsRef.current
      // Empty session = signed-in, never generated, idled >= 20s → useful "bounced from empty workspace" signal.
      if (!hasOutputRef.current && generateCountRef.current === 0 && dwellMs >= 20_000) {
        track('workspace_abandoned_empty', { dwell_ms_bucket: dwellMs < 60_000 ? '20-60s' : dwellMs < 180_000 ? '1-3m' : '3m+' })
      }
      // Generated but never saved — important activation signal.
      if (hasUnsavedOutputRef.current) {
        track('workspace_generated_without_saving', {
          generations: generateCountRef.current,
          saves: saveCountRef.current,
          dwell_ms_bucket: dwellMs < 60_000 ? '<1m' : dwellMs < 180_000 ? '1-3m' : '3m+',
        })
      }
    }
    window.addEventListener('pagehide', onLeave)
    return () => window.removeEventListener('pagehide', onLeave)
  }, [])

  // Rehydrate a saved project into workspace state (no full page reload).
  const loadProject = useCallback(async (id: string, opts?: { syncUrl?: boolean }) => {
    if (!id || loadingProjectId === id) return
    setLoadingProjectId(id)
    setGenerating(true) // reuses skeleton state on the output panel
    try {
      const res = await fetch(`/api/workspace/project/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not load project')
      setTopic(data.description || data.title || '')
      if (data.platform) setPlatform(data.platform)
      if (data.tone) setTone(data.tone)
      if (data.duration) setDuration(String(data.duration))
      setOutput(data.output as GenOutput)
      setSavedId(id)
      setActiveProjectId(id)
      setTab('hook')
      setRevealNonce(n => n + 1)
      if (opts?.syncUrl !== false) {
        const next = new URLSearchParams(searchParams.toString())
        next.set('project', id)
        router.replace(`/workspace?${next.toString()}`, { scroll: false })
      }
      // Project age (days) + legacy flag — useful for retention + churn analysis.
      const updatedAt = data?.updated_at ? new Date(data.updated_at).getTime() : 0
      const ageDays = updatedAt > 0 ? Math.max(0, Math.floor((Date.now() - updatedAt) / 86_400_000)) : null
      track('workspace_project_loaded', {
        id,
        legacy_project: !!data?.legacy,
        reopened_from_url: opts?.syncUrl === false, // false here means we were called from the mount-effect (URL-driven)
        project_age_days: ageDays ?? undefined,
        project_age_bucket:
          ageDays == null ? 'unknown' :
          ageDays === 0 ? 'today' :
          ageDays < 7 ? 'this_week' :
          ageDays < 30 ? 'this_month' : 'older',
      })
    } catch (e: any) {
      toast.error(e?.message || 'Could not load project')
    } finally {
      setGenerating(false)
      setLoadingProjectId(null)
    }
  }, [loadingProjectId, router, searchParams])

  // Deep-link support: on first mount, if ?project=xyz is present, hydrate it.
  useEffect(() => {
    const pid = searchParams.get('project')
    if (pid && pid !== activeProjectId) loadProject(pid, { syncUrl: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canGenerate = useMemo(() => topic.trim().length >= 6 && !generating, [topic, generating])

  const generate = async () => {
    if (!canGenerate) return
    setGenerating(true)
    setOutput(null)
    setSavedId(null)
    const topicLen = topic.trim().length
    const topicLenBucket = topicLen < 30 ? 'short' : topicLen < 120 ? 'medium' : topicLen < 400 ? 'long' : 'very_long'
    // Phase 2F \u2014 silent language detection. Fire telemetry but never block the flow.
    const detectedLanguage = detectInputLanguage(topic)
    track('input_language_detected', {
      detected_language: detectedLanguage,
      normalized: detectedLanguage !== 'english',
    })
    track('workspace_generate_clicked', {
      platform, tone, duration,
      topic_length: topicLen,
      topic_length_bucket: topicLenBucket,
      used_starter_prompt: usedStarterPromptRef.current,
      from_template: usedStarterPromptRef.current, // back-compat alias
      detected_language: detectedLanguage,
    })
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), platform, tone, duration: Number(duration) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Generation failed')
      setOutput(data.output as GenOutput)
      setTab('hook')
      setRevealNonce(n => n + 1)
      generateCountRef.current += 1
      const outLen = (['hook','script','storyboard','captions','thumbnailIdea'] as const)
        .reduce((acc, k) => acc + (data.output?.[k]?.length || 0), 0)
      track('workspace_generate_succeeded', {
        platform, tone, duration,
        topic_length_bucket: topicLenBucket,
        used_starter_prompt: usedStarterPromptRef.current,
        mock: !!data.mock,
        reason: data.reason || undefined,
        output_length_bucket: outLen < 2000 ? 'small' : outLen < 8000 ? 'medium' : 'large',
        generation_index: generateCountRef.current,
      })
    } catch (e: any) {
      toast.error(e?.message || 'Something went wrong')
      track('workspace_generate_failed', {
        error: String(e?.message || '').slice(0, 120),
        topic_length_bucket: topicLenBucket,
      })
    } finally {
      setGenerating(false)
    }
  }

  const saveProject = async () => {
    if (!output || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/workspace/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, platform, tone, duration, output }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Save failed')
      setSavedId(data.id)
      saveCountRef.current += 1
      toast.success('Saved to your projects')
      track('workspace_project_saved', {
        platform,
        used_starter_prompt: usedStarterPromptRef.current,
        save_index: saveCountRef.current,
      })
      return data.id as string
    } catch (e: any) {
      toast.error(e?.message || 'Could not save')
      track('workspace_save_failed', { error: String(e?.message || '').slice(0, 120) })
      return null
    } finally {
      setSaving(false)
    }
  }

  // V1.10 (Phase 2A) — helper for any feature that needs a persisted project id
  // (e.g. storyboard frame generation calls /api/ai/image which requires project_id).
  // Auto-saves once if the project hasn't been saved yet, then returns the id.
  const ensureSavedRef = useRef<() => Promise<string | null>>(async () => null)
  ensureSavedRef.current = async () => {
    if (savedId) return savedId
    return await saveProject() || null
  }

  const applyTemplate = (seed: string) => {
    setTopic(prev => prev ? prev : seed)
    usedStarterPromptRef.current = true
    track('workspace_template_applied', { seed: seed.slice(0, 40) })
  }

  const newProject = () => {
    setTopic(''); setOutput(null); setSavedId(null); setTab('hook'); setActiveProjectId(null)
    usedStarterPromptRef.current = false
    reopenedFromUrlRef.current = false
    const next = new URLSearchParams(searchParams.toString())
    next.delete('project')
    const qs = next.toString()
    router.replace(qs ? `/workspace?${qs}` : '/workspace', { scroll: false })
    track('workspace_new_project_clicked')
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-noir-radial">
      {/* LEFT SIDEBAR */}
      <aside className="lg:w-64 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-black/40 backdrop-blur-xl">
        <div className="p-4 lg:p-5 space-y-5">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-black"
                 style={{ background: 'linear-gradient(180deg,#E0C06E,#B48E3C)' }}>M</div>
            <span className="font-display text-base tracking-tight text-luxe group-hover:text-gold-200 transition">Mugtee</span>
          </Link>

          {/* Phase 3 — quiet creator navigation. Compact muted icons. No analytics, no agents. */}
          <nav aria-label="Mugtee navigation" className="space-y-0.5">
            <NavLink href="/" icon="home" label="Home" />
            <NavLink href="/workspace" icon="create" label="Create" active />
            <NavLink href="/dashboard" icon="scripts" label="Scripts" />
            <NavLink href="/dashboard" icon="storyboards" label="Storyboards" />
            <NavLink href="#" icon="voice" label="Voiceovers" soon />
            <NavLink href="/media" icon="library" label="Library" />
            <NavLink href="/settings" icon="settings" label="Settings" />
          </nav>

          <Button onClick={newProject} variant="outline"
            className="w-full h-10 gap-2 border-gold-500/30 hover:border-gold-500/60 bg-white/[0.03] text-luxe hover:text-gold-200">
            <Plus className="w-4 h-4" /> New Project
          </Button>

          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Recent</p>
            <div className="space-y-1">
              {recents.length === 0 && (
                <p className="text-[12px] text-luxe/40 leading-snug">Your saved reels will appear here.</p>
              )}
              {recents.map(p => {
                const isActive = p.id === activeProjectId
                const isLoading = p.id === loadingProjectId
                return (
                  <button key={p.id}
                    onClick={() => loadProject(p.id)}
                    disabled={isLoading}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] transition flex items-center gap-2 group disabled:opacity-60 ${
                      isActive
                        ? 'bg-gold-500/10 text-gold-200 ring-1 ring-gold-500/30'
                        : 'hover:bg-white/[0.05] text-luxe/85 hover:text-luxe'
                    }`}>
                    {isLoading
                      ? <Loader2 className="w-3.5 h-3.5 text-gold-400/70 shrink-0 animate-spin" />
                      : <Film className="w-3.5 h-3.5 text-gold-400/70 shrink-0" />}
                    <span className="truncate">{p.title}</span>
                    <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-60 transition" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Templates</p>
            <div className="space-y-1">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => applyTemplate(t.seed)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] text-[12.5px] text-luxe/85 hover:text-gold-200 transition flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-gold-400/70" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Made with Mugtee — static showcase. Pure inspiration; mobile-stacks naturally. */}
          <div className="space-y-2 pt-2 border-t border-white/[0.05]">
            <p className="text-[10px] tracking-[0.22em] uppercase text-gold-400/70 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Made with Mugtee
            </p>
            <div className="space-y-1.5">
              {SHOWCASE.map((s) => (
                <div key={s.title}
                  className="rounded-lg px-2.5 py-2 bg-white/[0.025] border border-white/[0.05] hover:border-gold-500/25 transition">
                  <p className="text-[12px] font-medium text-luxe leading-tight truncate">{s.title}</p>
                  <p className="text-[11px] text-luxe/55 leading-snug mt-0.5 italic line-clamp-2">{s.hook}</p>
                  <p className="text-[9.5px] tracking-[0.18em] uppercase text-gold-400/70 mt-1">{s.platform}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* CENTER PANEL */}
      <main className="flex-1 px-4 lg:px-10 py-8 lg:py-12 max-w-3xl mx-auto w-full">
        <div className="space-y-1 mb-3">
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-400/80">Creator Workspace</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-luxe">
            From idea to reel — in one prompt.
          </h1>
          <p className="text-[13.5px] text-luxe/55 leading-relaxed max-w-xl">
            Type your idea, pick a platform, and Mugtee will draft the hook, full script,
            storyboard beats, captions and a thumbnail concept.
          </p>
        </div>

        {/* Phase 3 — quiet creative-flow guidance. Two subtle hints, no dashboards. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6 text-[10.5px] text-luxe/40 tracking-[0.04em]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-gold-400/60" />
            Mugtee detects emotional pacing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-gold-400/60" />
            Optimized for short-form storytelling
          </span>
        </div>

        {/* Empty-state inspiration — appears until the creator has output or a draft topic. */}
        {!output && !generating && !topic.trim() && (
          <div className="mb-6 space-y-2.5 animate-in fade-in duration-500">
            <p className="text-[10px] tracking-[0.22em] uppercase text-gold-400/70 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Start with a feeling
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setTopic(p); usedStarterPromptRef.current = true; track('workspace_starter_clicked', { prompt: p, recents_count_bucket: recents.length === 0 ? 'none' : recents.length < 3 ? '1-2' : '3+' }) }}
                  className="px-3 py-1.5 rounded-full text-[12px] text-luxe/80 hover:text-gold-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-gold-500/40 transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <Card className="p-4 md:p-5 bg-black/40 backdrop-blur-xl border-white/[0.06] space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Your idea</label>
            <p className="text-[11.5px] text-luxe/45 italic leading-snug">
              Describe a cinematic idea, emotion, memory, or story.
            </p>
            <Textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. A 60-sec cinematic reel on why most people fail to start their dream brand..."
              className="min-h-[120px] bg-white/[0.03] border-white/[0.08] text-luxe placeholder:text-luxe/30 focus-visible:ring-gold-500/40 resize-none"
            />
            {/* Phase 2F \u2014 silent multilingual hint. Muted, passive, no controls. */}
            <p className="text-[10.5px] text-luxe/35 tracking-[0.04em] pt-0.5">
              Write in any language.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Platform</label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-10 bg-white/[0.03] border-white/[0.08]"><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-10 bg-white/[0.03] border-white/[0.08]"><SelectValue /></SelectTrigger>
                <SelectContent>{TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-10 bg-white/[0.03] border-white/[0.08]"><SelectValue /></SelectTrigger>
                <SelectContent>{DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={!canGenerate}
            className="w-full h-11 gap-2 bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Mugtee is creating...' : 'Generate with Mugtee'}
          </Button>
        </Card>

        {/* OUTPUT PANEL (mobile-stacked below center / desktop in right panel) */}
        <div className="lg:hidden mt-6">
          <OutputPanel output={output} loading={generating} tab={tab} setTab={setTab} onSave={saveProject} saving={saving} savedId={savedId} projectTitle={topic} revealNonce={revealNonce} ensureSaved={ensureSavedRef.current} platform={platform} tone={tone} mobile />
        </div>
      </main>

      {/* RIGHT PANEL */}
      <aside className="hidden lg:flex lg:w-[420px] xl:w-[480px] lg:shrink-0 border-l border-white/[0.06] bg-black/30 backdrop-blur-xl flex-col">
        <div className="p-5 flex-1">
          <OutputPanel output={output} loading={generating} tab={tab} setTab={setTab} onSave={saveProject} saving={saving} savedId={savedId} projectTitle={topic} revealNonce={revealNonce} ensureSaved={ensureSavedRef.current} platform={platform} tone={tone} />
        </div>
      </aside>

      {/* Phase 3 — quiet cinematic mascot, low presence, subtle gold halo. */}
      <WorkspaceMascot />
    </div>
  )
}

function OutputPanel({
  output, loading, tab, setTab, onSave, saving, savedId, projectTitle, revealNonce, mobile, ensureSaved, platform, tone,
}: {
  output: GenOutput | null
  loading: boolean
  tab: 'hook' | 'script' | 'storyboard' | 'captions' | 'thumbnail'
  setTab: (t: any) => void
  onSave: () => void
  saving: boolean
  savedId: string | null
  projectTitle?: string
  revealNonce?: number
  mobile?: boolean
  ensureSaved?: () => Promise<string | null>
  platform?: string
  tone?: string
}) {
  // V1.10 — Magic moment. When `revealNonce` bumps (after every successful
  // generation or project rehydration), scroll the output into view and apply a
  // brief gold ring + glow. Pure CSS / existing tokens, no animation library.
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [glow, setGlow] = useState(false)
  useEffect(() => {
    if (!revealNonce) return // 0 means "never generated this session"
    // Scroll-into-view is most useful on the mobile-stacked panel (the desktop
    // right-rail is always visible). Run on both \u2014 the desktop call is a no-op
    // since the panel is already in viewport.
    const id = setTimeout(() => {
      try {
        wrapRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: mobile ? 'start' : 'center',
        })
      } catch {}
    }, mobile ? 80 : 0)
    setGlow(true)
    const off = setTimeout(() => setGlow(false), 1600)
    return () => { clearTimeout(id); clearTimeout(off) }
  }, [revealNonce, mobile])

  return (
    <div
      ref={wrapRef}
      className={`space-y-3 h-full flex flex-col scroll-mt-6 rounded-2xl transition-all duration-700 ease-out ${
        glow ? 'ring-1 ring-gold-500/40 shadow-gold-glow' : 'ring-0 shadow-none'
      }`}
    >
      {/* Phase 3 — AI Director intelligence panel. Real state only, no fake metrics. */}
      <AIDirectorCard tone={tone || 'cinematic'} platform={platform || 'instagram_reel'} output={output} />

      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-400/80 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Mugtee Output
        </p>
        {output && (
          <div className="flex items-center gap-1.5">
            <ExportControls output={output} projectTitle={projectTitle} savedId={savedId} />
            <Button size="sm" variant="outline" onClick={onSave} disabled={saving || !!savedId}
              className="h-8 gap-1.5 text-[11.5px] border-gold-500/30 hover:border-gold-500/60 text-luxe hover:text-gold-200">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {savedId ? 'Saved' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-5 bg-white/[0.03] border border-white/[0.06] h-9">
          <TabsTrigger value="hook" className="text-[11.5px] gap-1"><Zap className="w-3 h-3" />Hook</TabsTrigger>
          <TabsTrigger value="script" className="text-[11.5px] gap-1"><FileText className="w-3 h-3" />Script</TabsTrigger>
          <TabsTrigger value="storyboard" className="text-[11.5px] gap-1"><Film className="w-3 h-3" />Beats</TabsTrigger>
          <TabsTrigger value="captions" className="text-[11.5px] gap-1"><MessageCircle className="w-3 h-3" />Caps</TabsTrigger>
          <TabsTrigger value="thumbnail" className="text-[11.5px] gap-1"><ImageIcon className="w-3 h-3" />Thumb</TabsTrigger>
        </TabsList>

        {(['hook','script','storyboard','captions','thumbnail'] as const).map(key => (
          <TabsContent key={key} value={key} className="flex-1 mt-3">
            {key === 'storyboard' && output && (output.storyboard || '').trim().length > 20 && (
              <StoryboardTiming storyboardText={output.storyboard} />
            )}
            <OutputBody loading={loading} text={output ? output[key === 'thumbnail' ? 'thumbnailIdea' : key] : ''} />
            {key === 'storyboard' && output && (output.storyboard || '').trim().length > 20 && (
              <StoryboardFrames
                storyboardText={output.storyboard}
                projectTitle={projectTitle}
                savedId={savedId}
                ensureSaved={ensureSaved}
                platform={platform}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function OutputBody({ loading, text }: { loading: boolean; text: string }) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4 bg-white/[0.04]" />
        <Skeleton className="h-4 w-full bg-white/[0.04]" />
        <Skeleton className="h-4 w-5/6 bg-white/[0.04]" />
        <Skeleton className="h-4 w-2/3 bg-white/[0.04]" />
      </div>
    )
  }
  if (!text) {
    return (
      <div className="h-full min-h-[200px] rounded-xl border border-dashed border-white/[0.08] bg-black/20 flex flex-col items-center justify-center text-center p-6">
        <Sparkles className="w-5 h-5 text-gold-400/50 mb-3" />
        <p className="font-display text-[15px] text-luxe/80 italic leading-snug max-w-[260px]">
          Some stories arrive like memories.
        </p>
        <p className="text-[11.5px] text-luxe/40 max-w-[240px] leading-relaxed mt-2">
          Type an idea and hit <Badge variant="outline" className="mx-1 px-1.5 py-0 text-[10px] border-gold-500/30">Generate</Badge> — Mugtee will read the pacing and atmosphere from your story.
        </p>
      </div>
    )
  }
  return (
    <pre className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.75] text-luxe/90 font-sans tracking-[0.005em] rounded-xl border border-white/[0.06] bg-black/20 p-5 max-h-[520px] overflow-auto scrollbar-luxe">
      {text}
    </pre>
  )
}


// =====================================================================
// EXPORT CONTROLS — Copy All / Download TXT / Download MD
// Pure client-side. No backend, no new deps. Reuses existing Button + sonner.
// =====================================================================

const SECTIONS: { key: keyof GenOutput; label: string }[] = [
  { key: 'hook',          label: 'Hook' },
  { key: 'script',        label: 'Script' },
  { key: 'storyboard',    label: 'Storyboard' },
  { key: 'captions',      label: 'Captions' },
  { key: 'thumbnailIdea', label: 'Thumbnail Idea' },
]

function formatAsText(out: GenOutput, title?: string): string {
  const parts: string[] = []
  if (title?.trim()) {
    parts.push(title.trim())
    parts.push('—'.repeat(Math.min(title.trim().length, 48)))
    parts.push('')
  }
  for (const { key, label } of SECTIONS) {
    parts.push(label.toUpperCase())
    parts.push((out[key] || '').trim() || '(empty)')
    parts.push('')
  }
  parts.push('—')
  parts.push('Generated with Mugtee AI Studio · mugtee.in')
  return parts.join('\n')
}

function formatAsMarkdown(out: GenOutput, title?: string): string {
  const parts: string[] = []
  if (title?.trim()) parts.push(`# ${title.trim()}`, '')
  for (const { key, label } of SECTIONS) {
    parts.push(`# ${label}`, '')
    parts.push((out[key] || '').trim() || '_(empty)_', '')
  }
  parts.push('---')
  parts.push('_Generated with [Mugtee AI Studio](https://mugtee.in)._')
  return parts.join('\n')
}

function slugify(s?: string) {
  if (!s) return 'untitled'
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'untitled'
}

function downloadBlob(text: string, filename: string, mime: string) {
  try {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Defer revoke so Safari has time to read the URL.
    setTimeout(() => URL.revokeObjectURL(url), 800)
    return true
  } catch {
    return false
  }
}

function ExportControls({ output, projectTitle, savedId }: { output: GenOutput; projectTitle?: string; savedId?: string | null }) {
  const hasContent = SECTIONS.some(s => (output[s.key] || '').trim().length > 0)
  const totalLen = SECTIONS.reduce((acc, s) => acc + (output[s.key]?.length || 0), 0)
  const lengthBucket = totalLen < 2000 ? 'small' : totalLen < 8000 ? 'medium' : 'large'
  const baseExportPayload = {
    export_type: '' as 'copy' | 'txt' | 'md',
    output_length_bucket: lengthBucket,
    has_saved_project: !!savedId,
    has_title: !!projectTitle,
  }
  const stamp = () => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  }
  const baseName = () => `mugtee-${slugify(projectTitle)}-${stamp()}`

  const copyAll = async () => {
    try {
      const text = formatAsText(output, projectTitle)
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast.success('Copied to clipboard')
      track('workspace_export_copy',  { ...baseExportPayload, export_type: 'copy' })
      track('workspace_export',       { ...baseExportPayload, export_type: 'copy' })
    } catch {
      toast.error('Could not copy — try the Download buttons instead.')
      track('workspace_export_failed', { ...baseExportPayload, export_type: 'copy' })
    }
  }

  const downloadTxt = () => {
    const ok = downloadBlob(formatAsText(output, projectTitle), `${baseName()}.txt`, 'text/plain')
    if (ok) {
      toast.success('TXT downloaded')
      track('workspace_export_txt', { ...baseExportPayload, export_type: 'txt' })
      track('workspace_export',     { ...baseExportPayload, export_type: 'txt' })
    } else {
      toast.error('Download failed')
      track('workspace_export_failed', { ...baseExportPayload, export_type: 'txt' })
    }
  }

  const downloadMd = () => {
    const ok = downloadBlob(formatAsMarkdown(output, projectTitle), `${baseName()}.md`, 'text/markdown')
    if (ok) {
      toast.success('Markdown downloaded')
      track('workspace_export_md', { ...baseExportPayload, export_type: 'md' })
      track('workspace_export',    { ...baseExportPayload, export_type: 'md' })
    } else {
      toast.error('Download failed')
      track('workspace_export_failed', { ...baseExportPayload, export_type: 'md' })
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm" variant="ghost" onClick={copyAll} disabled={!hasContent}
        title="Copy all sections to clipboard"
        className="h-8 w-8 p-0 text-luxe/70 hover:text-gold-200 hover:bg-white/[0.05] disabled:opacity-40"
      >
        <Copy className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="sm" variant="ghost" onClick={downloadTxt} disabled={!hasContent}
        title="Download as plain text (.txt)"
        className="h-8 w-8 p-0 text-luxe/70 hover:text-gold-200 hover:bg-white/[0.05] disabled:opacity-40"
      >
        <Download className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="sm" variant="ghost" onClick={downloadMd} disabled={!hasContent}
        title="Download as Markdown (.md)"
        className="h-8 w-8 p-0 text-luxe/70 hover:text-gold-200 hover:bg-white/[0.05] disabled:opacity-40"
      >
        <FileType className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}


// =====================================================================
// Phase 2H — SHOT TIMING ENGINE
// Lightweight keyword-driven pacing heuristic. Pure local function +
// pure presentational component. No API, no LLM, no new state systems.
// Estimates per-shot duration (2–5s) and assigns one of four cinematic
// pacing tags: Slow Burn / Fast Cut / Emotional Pause / Climactic.
// =====================================================================
type PacingTag = 'Slow Burn' | 'Fast Cut' | 'Emotional Pause' | 'Climactic'
type ShotTiming = { index: number; durationSeconds: number; tag?: PacingTag }

// Parse ALL shot blocks (no 6-cap like parseShots). Frames are limited to 6
// for credit reasons; pacing math should reflect the full storyboard.
function parseAllShotBlocks(storyboard: string): string[] {
  if (!storyboard) return []
  return storyboard
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .filter(b => /^\s*\d+\./.test(b) || /Shot:|Framing:|Movement:|Lighting:/.test(b))
}

function estimateShotTiming(shotText: string, index: number, total: number): ShotTiming {
  const t = shotText.toLowerCase()
  // Climactic — last or second-last shot, OR keyword signal of a payoff moment.
  const isFinal = index >= total - 1
  if (/\b(climax|reveal|payoff|resolution|smash[- ]?to|final frame|hero wide|end card|hold to black|title card)\b/.test(t)
      || (isFinal && /\b(black|silence|hold|title|brand)\b/.test(t))) {
    return { index, durationSeconds: 5, tag: 'Climactic' }
  }
  // Emotional Pause — intimate close-ups, silences, held looks, breath.
  if (/\b(close[- ]?up|stare|silence|silent|tears?|breath|hold|whisper|memory|alone|empty|tender|aching|quiet)\b/.test(t)) {
    return { index, durationSeconds: 5, tag: 'Emotional Pause' }
  }
  // Fast Cut — kinetic / aggressive movement, hard cuts, smash transitions.
  if (/\b(smash|whip|punch|shake|chase|quick|hard[- ]?cut|j[- ]?cut|cutaway|rapid|kinetic|jolt|burst|impact)\b/.test(t)) {
    return { index, durationSeconds: 2, tag: 'Fast Cut' }
  }
  // Slow Burn — slow camera moves, push-ins, drifts, dolly, lingering.
  if (/\b(slow|drift|dolly|push[- ]?in|pull[- ]?out|wait|linger|locked[- ]?off)\b/.test(t)) {
    return { index, durationSeconds: 4, tag: 'Slow Burn' }
  }
  // First shot tends to be the hook — gentle slow burn feel by default.
  if (index === 0) return { index, durationSeconds: 3, tag: 'Slow Burn' }
  // Wide / establishing — short, breath-of-air shots.
  if (/\b(wide|establish|environmental|horizon|landscape|exterior)\b/.test(t)) {
    return { index, durationSeconds: 3 }
  }
  // Default cinematic cadence.
  return { index, durationSeconds: 3 }
}

function StoryboardTiming({ storyboardText }: { storyboardText: string }) {
  const timings = useMemo(() => {
    const blocks = parseAllShotBlocks(storyboardText)
    return blocks.map((s, i) => estimateShotTiming(s, i, blocks.length))
  }, [storyboardText])
  if (!timings.length) return null
  const total = timings.reduce((sum, t) => sum + t.durationSeconds, 0)
  return (
    <div className="mb-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
        <span className="text-[9.5px] tracking-[0.22em] uppercase text-luxe/45">Pacing</span>
        <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/85">
          Estimated Runtime · {total}s
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {timings.map(t => (
          <div
            key={t.index}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/30 border border-white/[0.05] text-[10px] leading-none"
          >
            <span className="text-luxe/45 tracking-[0.04em] font-mono">{String(t.index + 1).padStart(2, '0')}</span>
            <span className="text-gold-200/90 font-medium font-mono">{t.durationSeconds}s</span>
            {t.tag && (
              <span className="text-luxe/55 tracking-[0.04em] hidden sm:inline">
                {t.tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// =====================================================================
// STORYBOARD FRAMES — Phase 2A cinematic still generation
// Reuses /api/ai/image (Gemini via Emergent gateway) which already stores
// to project_assets. Lists existing frames via /api/projects/[id]/assets.
// Auto-saves the workspace project on first generate so /api/ai/image gets
// a real project_id (it's a hard requirement of that endpoint).
// =====================================================================

type FrameAsset = {
  id: string
  url: string
  prompt?: string
  shotText?: string                       // cached for single-frame regenerate
  mood?: MoodId                           // Phase 2D — visual mood lock used to generate this frame
  cameraStyle?: CameraStyleId             // Phase 2G — camera style lock used to generate this frame
  metadata?: Record<string, any> | null
  created_at?: string
  regenerating?: boolean                  // local-only UI flag
}

function parseShots(storyboard: string): string[] {
  if (!storyboard) return []
  const blocks = storyboard
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .filter(b => /^\s*\d+\./.test(b) || /Shot:|Framing:|Movement:|Lighting:/.test(b))
  return blocks.slice(0, 6)
}

function frameAspectFor(platform?: string): '1:1' | '9:16' | '16:9' {
  if (platform === 'youtube_video') return '16:9'
  return '9:16'
}

// =====================================================================
// Phase 2D — VISUAL MOOD LOCK
// Lightweight cinematic mood conditioning. Appended to the existing
// frame prompt only. Does not change generation architecture or storage.
// =====================================================================
type MoodId =
  | 'emotional_indie'
  | 'warm_nostalgia'
  | 'noir_documentary'
  | 'cold_scifi'
  | 'dreamlike_cinema'
  | 'gritty_realism'

const MOODS: { id: MoodId; label: string; suffix: string }[] = [
  { id: 'emotional_indie',  label: 'Emotional Indie',   suffix: 'soft natural lighting, intimate handheld realism, muted cinematic tones, shallow depth of field' },
  { id: 'warm_nostalgia',   label: 'Warm Nostalgia',    suffix: 'golden-hour warmth, Kodak-style grading, nostalgic film grain, warm cinematic shadows' },
  { id: 'noir_documentary', label: 'Noir Documentary',  suffix: 'high contrast monochrome realism, dramatic shadows, grainy documentary photography' },
  { id: 'cold_scifi',       label: 'Cold Sci-Fi',       suffix: 'cool blue cinematic highlights, atmospheric futuristic realism, clean contrast' },
  { id: 'dreamlike_cinema', label: 'Dreamlike Cinema',  suffix: 'ethereal cinematic haze, soft bloom lighting, poetic atmosphere' },
  { id: 'gritty_realism',   label: 'Gritty Realism',    suffix: 'raw documentary texture, grounded realism, natural imperfect lighting' },
]
const MOOD_BY_ID: Record<string, { id: MoodId; label: string; suffix: string }> =
  Object.fromEntries(MOODS.map(m => [m.id, m])) as any

const MOOD_STORAGE_KEY = 'mugtee:workspace:mood'

// =====================================================================
// Phase 2G — CAMERA STYLE LOCK
// Lightweight cinematic framing conditioning. One subtle suffix appended
// to the existing frame prompt. Mood + characters + camera all coexist.
// =====================================================================
type CameraStyleId =
  | 'intimate_handheld'
  | 'cinematic_wide'
  | 'documentary_realism'
  | 'slow_cinema'
  | 'static_auteur'
  | 'dreamlike_motion'

const CAMERA_STYLES: { id: CameraStyleId; label: string; suffix: string }[] = [
  { id: 'intimate_handheld',    label: 'Intimate Handheld',    suffix: 'intimate handheld framing, close emotional composition, natural camera movement' },
  { id: 'cinematic_wide',       label: 'Cinematic Wide',       suffix: 'epic cinematic wide framing, environmental scale, dramatic composition' },
  { id: 'documentary_realism',  label: 'Documentary Realism',  suffix: 'grounded documentary cinematography, observational framing' },
  { id: 'slow_cinema',          label: 'Slow Cinema',          suffix: 'restrained minimalist composition, quiet slow cinema atmosphere' },
  { id: 'static_auteur',        label: 'Static Auteur',        suffix: 'symmetrical static composition, auteur-style framing, deliberate cinematography' },
  { id: 'dreamlike_motion',     label: 'Dreamlike Motion',     suffix: 'soft drifting cinematic framing, poetic motion language, dreamlike composition' },
]
const CAMERA_STYLE_BY_ID: Record<string, { id: CameraStyleId; label: string; suffix: string }> =
  Object.fromEntries(CAMERA_STYLES.map(c => [c.id, c])) as any

const CAMERA_STYLE_STORAGE_KEY = 'mugtee:workspace:camera-style'

// =====================================================================
// Phase 2E — CHARACTER CONSISTENCY (heuristic-only, in-session memory)
// Pure local string parsing. No NLP, no embeddings, no face models,
// no DB, no API. Detects recurring character noun phrases across the
// storyboard and accumulates lightweight visual descriptors so that
// every frame mentioning the same character carries the same continuity
// line into the existing prompt builder.
// =====================================================================
const ROLE_NOUNS: ReadonlySet<string> = new Set([
  // Occupations / archetypes
  'fisherman','astronaut','detective','teacher','farmer','priest','monk','soldier','sailor',
  'writer','filmmaker','musician','director','painter','photographer','hunter','chef','baker',
  'driver','doctor','nurse','dancer','singer','barber','mechanic','tailor','potter','poet',
  'pilgrim','student','mentor','widow','widower','stranger','traveller','traveler','lover',
  // Family relations (English + common Indian terms)
  'father','mother','son','daughter','brother','sister','grandfather','grandmother',
  'aaji','dadi','nani','dada','nana','grandpa','grandma','dad','mom','mum','papa',
  'uncle','aunt','husband','wife','child','boy','girl','man','woman',
])

const DESCRIPTOR_WORDS: ReadonlySet<string> = new Set([
  // Age / state
  'old','young','aging','elderly','tired','weary','lonely','silent','quiet','stern',
  'gentle','kind','sad','broken','rugged','weathered','wrinkled','frail',
  // Look
  'bearded','grey-haired','grey-bearded','long-haired','short-haired','barefoot','blind',
  'tall','short','slim','thin','small','tiny','little',
])

type CharacterMemory = {
  key: string              // canonical role noun, e.g. 'fisherman'
  role: string             // same as key
  display: string          // 'Old Fisherman' for the chip
  descriptors: string[]    // collected adjectives across all mentions, order-stable
  shotIndices: number[]    // shot indices where this role was mentioned
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

// Detect recurring characters from the parsed shot list.
// A "recurring" character = role noun appearing in 2+ distinct shots.
function detectCharacters(shots: string[]): CharacterMemory[] {
  const map = new Map<string, CharacterMemory>()
  shots.forEach((shotText, idx) => {
    // Tokenize without apostrophes so possessives ("fisherman's") still match the
    // base role noun. Hyphens preserved so "grey-bearded" stays a single token.
    const tokens = (shotText.toLowerCase().match(/[a-z][a-z-]*/g) || [])
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i]
      if (!ROLE_NOUNS.has(w)) continue
      const lead2 = tokens[i - 2]
      const lead1 = tokens[i - 1]
      const found: string[] = []
      if (lead2 && DESCRIPTOR_WORDS.has(lead2)) found.push(lead2)
      if (lead1 && DESCRIPTOR_WORDS.has(lead1)) found.push(lead1)
      let entry = map.get(w)
      if (!entry) {
        entry = { key: w, role: w, display: titleCase(w), descriptors: [], shotIndices: [] }
        map.set(w, entry)
      }
      if (!entry.shotIndices.includes(idx)) entry.shotIndices.push(idx)
      for (const d of found) {
        if (!entry.descriptors.includes(d)) entry.descriptors.push(d)
      }
    }
  })
  // Recurring only
  return Array.from(map.values())
    .filter(c => c.shotIndices.length >= 2)
    .map(c => {
      const lead = c.descriptors[0]
      c.display = titleCase(lead ? `${lead} ${c.role}` : c.role)
      return c
    })
}

// Returns the characters that actually appear in a specific shot's text.
function charactersInShot(shotText: string, characters: CharacterMemory[]): CharacterMemory[] {
  if (!characters.length) return []
  const tokens = new Set((shotText.toLowerCase().match(/[a-z][a-z-]*/g) || []))
  return characters.filter(c => tokens.has(c.role))
}

// Build a continuity line for the prompt from an array of characters.
function continuityLineFor(present: CharacterMemory[]): string {
  if (!present.length) return ''
  const phrases = present.map(c => {
    const descs = c.descriptors.length ? c.descriptors.join(' ') + ' ' : ''
    return `${descs}${c.role}`.trim()
  })
  return `\n\nMaintain visual consistency with previous frames: ${phrases.join('; ')}.`
}

function buildFramePrompt(
  shotText: string,
  index: number,
  moodId?: string,
  characters?: CharacterMemory[],
  cameraStyleId?: string,
  opts?: { baselineOnly?: boolean },
) {
  // Phase 2H reliability — compact baseline. Single line, ~15 words.
  // Removes verbose enumerations that previously bloated each prompt.
  const baseline = 'Cinematic film still, 35mm grain, shallow depth of field, motivated lighting, warm-shadow cool-highlight grade. No text, no logos.'

  // Retry path uses baseline only — drops mood / continuity / camera to give
  // Gemini the best chance of a clean generation.
  if (opts?.baselineOnly) {
    return `Frame ${index + 1}\n${shotText}\n${baseline}`
  }

  // Compact mood suffix — short modifier phrase only (no "Visual Mood Lock:" label).
  const moodSuffix = (moodId && MOOD_BY_ID[moodId])
    ? ` Mood: ${MOOD_BY_ID[moodId].suffix}.`
    : ''

  // Compact continuity — single descriptor line, no leading sentence.
  const present = characters && characters.length
    ? charactersInShot(shotText, characters)
    : []
  const continuitySuffix = present.length
    ? ' Recurring: ' + present.map(c => {
        const descs = c.descriptors.length ? c.descriptors.join(' ') + ' ' : ''
        return `${descs}${c.role}`.trim()
      }).join(', ') + '.'
    : ''

  // Compact camera style suffix.
  const cameraSuffix = (cameraStyleId && CAMERA_STYLE_BY_ID[cameraStyleId])
    ? ` Camera: ${CAMERA_STYLE_BY_ID[cameraStyleId].suffix}.`
    : ''

  return `Frame ${index + 1}\n${shotText}\n${baseline}${moodSuffix}${continuitySuffix}${cameraSuffix}`
}

// =====================================================================
// Phase 2D — SMART FRAME EXPORT NAMING
// Slugify the project title, pad the order, fall back safely.
// Example: lonely-astronaut_s02_sh01.png  ·  fallback: mugtee_s01_sh01.png
// =====================================================================
function slugifyProject(s?: string): string {
  if (!s) return 'mugtee'
  const slug = s
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019\u201C\u201D'"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'mugtee'
}
function frameFileName(projectTitle: string | undefined, index: number): string {
  const project = slugifyProject(projectTitle)
  const seq = String(Math.max(0, index) + 1).padStart(2, '0')
  return `${project}_s${seq}_sh01.png`
}

function StoryboardFrames({
  storyboardText, projectTitle, savedId, ensureSaved, platform,
}: {
  storyboardText: string
  projectTitle?: string
  savedId: string | null
  ensureSaved?: () => Promise<string | null>
  platform?: string
}) {
  const shots = useMemo(() => parseShots(storyboardText), [storyboardText])
  // Phase 2E — derive recurring characters from the storyboard (in-session memory).
  const characters = useMemo(() => detectCharacters(shots), [shots])
  const [frames, setFrames] = useState<FrameAsset[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  // Phase 2D — Visual Mood Lock. Local state, persisted to localStorage so the
  // creator's mood choice sticks across sessions without any backend changes.
  const [mood, setMoodState] = useState<MoodId>('emotional_indie')
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(MOOD_STORAGE_KEY) as MoodId | null
      if (saved && MOOD_BY_ID[saved]) setMoodState(saved)
    } catch {}
  }, [])
  const setMood = useCallback((next: MoodId) => {
    setMoodState(next)
    try { window.localStorage.setItem(MOOD_STORAGE_KEY, next) } catch {}
    try { window.dispatchEvent(new CustomEvent('mugtee:directing-changed')) } catch {}
    track('storyboard_mood_changed', { mood: next })
  }, [])

  // Phase 2G — Camera Style Lock. Same pattern as Mood Lock. Persisted locally.
  const [cameraStyle, setCameraStyleState] = useState<CameraStyleId>('intimate_handheld')
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(CAMERA_STYLE_STORAGE_KEY) as CameraStyleId | null
      if (saved && CAMERA_STYLE_BY_ID[saved]) setCameraStyleState(saved)
    } catch {}
  }, [])
  const setCameraStyle = useCallback((next: CameraStyleId) => {
    setCameraStyleState(next)
    try { window.localStorage.setItem(CAMERA_STYLE_STORAGE_KEY, next) } catch {}
    try { window.dispatchEvent(new CustomEvent('mugtee:directing-changed')) } catch {}
    track('camera_style_changed', { style: next, project_id: savedId || undefined })
  }, [savedId])

  // Reset + hydrate any existing frames for this project (so refresh / project switch shows them).
  useEffect(() => {
    setFrames([])
    if (!savedId) return
    let alive = true
    fetch(`/api/projects/${savedId}/assets?kind=image`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        const fr: FrameAsset[] = (d?.assets || []).slice(0, 8)
        if (fr.length) setFrames(fr)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [savedId])

  const canGenerate = shots.length >= 1 && !busy

  const generate = async () => {
    if (!canGenerate) return
    // Phase 2H reliability — cap initial generation at 3 frames (was 6) to
    // improve Gemini stability + latency. parseShots still returns up to 6;
    // we just slice here so the creator can regenerate the others later.
    const FRAME_CAP = 3
    const targetShots = shots.slice(0, FRAME_CAP)

    setBusy(true)
    setProgress({ done: 0, total: targetShots.length })
    track('storyboard_frames_clicked', { shot_count: targetShots.length, platform, mood, camera_style: cameraStyle, characters: characters.length })
    try {
      let pid = savedId
      if (!pid && ensureSaved) pid = await ensureSaved()
      if (!pid) {
        toast.error('Please save the project before generating frames.')
        return
      }
      const aspect = frameAspectFor(platform)
      // Start fresh so re-generate replaces the visible set; the DB still keeps history.
      setFrames([])
      const collected: FrameAsset[] = []
      let retryCount = 0
      for (let i = 0; i < targetShots.length; i++) {
        // Helper: single attempt. Returns the new FrameAsset on success, or null on fail.
        const attempt = async (baselineOnly: boolean): Promise<FrameAsset | null> => {
          try {
            const res = await fetch('/api/ai/image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_id: pid,
                prompt: buildFramePrompt(targetShots[i], i, mood, characters, cameraStyle, { baselineOnly }),
                aspect_ratio: aspect,
                sequence_index: i,
              }),
            })
            const data = await res.json().catch(() => ({} as any))
            // V3.6 response shape is { ok, asset: { id, url, prompt, metadata } }.
            const asset = data?.asset || data
            if (res.ok && asset?.url) {
              return {
                id: asset.id,
                url: asset.url,
                prompt: asset.prompt,
                metadata: asset.metadata,
                shotText: targetShots[i],
                mood,
                cameraStyle,
              }
            }
            console.error('[frames] gen failed', { index: i, status: res.status, baselineOnly, error: data?.error, detail: typeof data?.detail === 'string' ? data.detail.slice(0, 200) : undefined })
            return null
          } catch (e: any) {
            console.error('[frames] gen exception', { index: i, baselineOnly, message: e?.message })
            return null
          }
        }

        // First attempt — full cinematic stack (mood + continuity + camera).
        let fr = await attempt(false)
        // Phase 2H — graceful retry on baseline-only prompt if the rich stack failed.
        if (!fr) {
          retryCount++
          fr = await attempt(true)
        }

        if (fr) {
          collected.push(fr)
          setFrames(prev => [...prev, fr!])
        }
        setProgress({ done: i + 1, total: targetShots.length })
      }
      if (collected.length === 0) {
        toast.error('Some cinematic frames couldn\u2019t render. Try again in a moment.')
        track('storyboard_frames_failed', { shot_count: targetShots.length, retries: retryCount })
      } else if (collected.length < targetShots.length) {
        toast.message(`${collected.length}/${targetShots.length} cinematic frames ready \u00b7 some couldn\u2019t render`)
        track('storyboard_frames_partial', { generated: collected.length, requested: targetShots.length, retries: retryCount, mood, camera_style: cameraStyle })
      } else {
        toast.success(`${collected.length} cinematic frame${collected.length === 1 ? '' : 's'} ready`)
        track('storyboard_frames_completed', { generated: collected.length, requested: targetShots.length, retries: retryCount, mood, camera_style: cameraStyle })
      }
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  if (shots.length === 0) return null

  return (
    <div className="mt-4 space-y-3">
      {/* Phase 2E — Cinematic Character Continuity. Passive chips, low visual weight. */}
      {characters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9.5px] tracking-[0.22em] uppercase text-luxe/45 mr-1">Continuity</span>
          {characters.map(c => (
            <span
              key={c.key}
              title={c.descriptors.length ? `${c.descriptors.join(' ')} ${c.role} \u00b7 ${c.shotIndices.length} frames` : `${c.role} \u00b7 ${c.shotIndices.length} frames`}
              className="px-2 py-0.5 rounded-full text-[10px] tracking-[0.04em] bg-white/[0.025] border border-white/[0.07] text-luxe/65"
            >
              {c.display}
            </span>
          ))}
        </div>
      )}

      {/* Phase 2D — Visual Mood Lock pill picker. Subtle, compact, gold-active. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9.5px] tracking-[0.22em] uppercase text-luxe/45 mr-1">Visual Mood</span>
        {MOODS.map(m => {
          const active = mood === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMood(m.id)}
              disabled={busy}
              title={m.suffix}
              className={
                'px-2.5 py-1 rounded-full text-[10.5px] tracking-[0.04em] transition border ' +
                (active
                  ? 'bg-gold-500/15 border-gold-500/55 text-gold-200 shadow-[0_0_14px_-6px_rgba(245,196,77,0.55)]'
                  : 'bg-white/[0.025] border-white/[0.07] text-luxe/65 hover:text-gold-200 hover:border-gold-500/40') +
                (busy ? ' opacity-50 cursor-not-allowed' : '')
              }
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Phase 2G — Camera Style Lock pill picker. Same restrained aesthetic. */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9.5px] tracking-[0.22em] uppercase text-luxe/45 mr-1">Camera Style</span>
          {CAMERA_STYLES.map(c => {
            const active = cameraStyle === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCameraStyle(c.id)}
                disabled={busy}
                title={c.suffix}
                className={
                  'px-2.5 py-1 rounded-full text-[10.5px] tracking-[0.04em] transition border ' +
                  (active
                    ? 'bg-gold-500/15 border-gold-500/55 text-gold-200 shadow-[0_0_14px_-6px_rgba(245,196,77,0.55)]'
                    : 'bg-white/[0.025] border-white/[0.07] text-luxe/65 hover:text-gold-200 hover:border-gold-500/40') +
                  (busy ? ' opacity-50 cursor-not-allowed' : '')
                }
              >
                {c.label}
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-luxe/35 italic tracking-[0.02em] pl-0.5">
          Influences framing and cinematic composition.
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[10px] tracking-[0.22em] uppercase text-gold-400/80 flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" /> Cinematic Frames
          {frames.length > 0 && (
            <span className="ml-1 text-[9.5px] tracking-[0.18em] text-luxe/50">{'\u00b7 '}{frames.length}</span>
          )}
        </div>
        <Button
          size="sm" variant="outline" onClick={generate} disabled={!canGenerate}
          className="h-8 gap-1.5 text-[11.5px] border-gold-500/30 hover:border-gold-500/60 text-luxe hover:text-gold-200 disabled:opacity-50"
          title={savedId ? 'Generate cinematic stills from this storyboard' : 'Saves the project and generates cinematic stills'}
        >
          {busy
            ? <><Loader2 className="w-3 h-3 animate-spin" /> {progress ? `${progress.done}/${progress.total}` : 'Working\u2026'}</>
            : <><Sparkles className="w-3 h-3" /> {frames.length > 0 ? 'Regenerate' : 'Generate Frames'}</>
          }
        </Button>
      </div>

      {(frames.length > 0 || busy) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {frames.map((f, i) => (
            <FrameCard
              key={f.id || i}
              frame={f}
              index={i}
              storyboardText={storyboardText}
              projectTitle={projectTitle}
              onRegenerate={async () => {
                const pid = savedId
                if (!pid) { toast.error('Save the project first.'); return }
                // Re-derive the shot text if it wasn't stored (e.g. legacy DB hydration).
                const fallbackShot = parseShots(storyboardText)[i] || f.shotText || ''
                const shotText = f.shotText || fallbackShot
                if (!shotText) { toast.error('Original shot text not found.'); return }
                setFrames(prev => prev.map((x, idx) => idx === i ? { ...x, regenerating: true } : x))
                track('storyboard_frame_regenerated', { index: i, mood, camera_style: cameraStyle })

                // Phase 2H reliability — same retry pattern as bulk gen.
                const attempt = async (baselineOnly: boolean) => {
                  try {
                    const res = await fetch('/api/ai/image', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        project_id: pid,
                        prompt: buildFramePrompt(shotText, i, mood, characters, cameraStyle, { baselineOnly }),
                        aspect_ratio: frameAspectFor(platform),
                        sequence_index: i,
                      }),
                    })
                    const data = await res.json().catch(() => ({} as any))
                    const asset = data?.asset || data
                    if (res.ok && asset?.url) return asset
                    console.error('[frames] regen failed', { index: i, status: res.status, baselineOnly, error: data?.error })
                    return null
                  } catch (e: any) {
                    console.error('[frames] regen exception', { index: i, baselineOnly, message: e?.message })
                    return null
                  }
                }

                let asset = await attempt(false)
                if (!asset) asset = await attempt(true)

                if (asset?.url) {
                  setFrames(prev => prev.map((x, idx) => idx === i
                    ? { id: asset.id, url: asset.url, prompt: asset.prompt, metadata: asset.metadata, shotText, mood, cameraStyle }
                    : x))
                  toast.success(`Frame ${String(i + 1).padStart(2, '0')} refreshed`)
                } else {
                  setFrames(prev => prev.map((x, idx) => idx === i ? { ...x, regenerating: false } : x))
                  toast.error('This frame couldn\u2019t render. Try again in a moment.')
                }
              }}
            />
          ))}
          {busy && progress && Array.from({ length: Math.max(0, progress.total - progress.done) }).map((_, i) => (
            <div key={`sk-${i}`} className="aspect-[9/16] rounded-lg bg-white/[0.03] border border-white/[0.04] overflow-hidden">
              <Skeleton className="w-full h-full bg-white/[0.04]" />
            </div>
          ))}
        </div>
      )}

      {frames.length === 0 && !busy && (
        <p className="text-[11.5px] text-luxe/45 italic leading-snug">
          {savedId
            ? `Generate ${Math.min(shots.length, 3)} cinematic still${Math.min(shots.length, 3) === 1 ? '' : 's'} from this storyboard.`
            : `We'll save your project once, then generate ${Math.min(shots.length, 3)} cinematic still${Math.min(shots.length, 3) === 1 ? '' : 's'}.`}
        </p>
      )}
    </div>
  )
}

// =====================================================================
// FRAME CARD — Phase 2B hover actions
// Per-frame Download / Regenerate / Copy Prompt overlay. Pure client,
// reuses existing /api/ai/image (regen) + Blob (download) + sonner.
// =====================================================================
function FrameCard({
  frame, index, storyboardText, projectTitle, onRegenerate,
}: {
  frame: FrameAsset
  index: number
  storyboardText: string
  projectTitle?: string
  onRegenerate: () => void | Promise<void>
}) {
  const label = String(index + 1).padStart(2, '0')

  const downloadFrame = async () => {
    // Phase 2D — smart export naming: <project>_s{NN}_sh01.png with safe fallback.
    const filename = frameFileName(projectTitle, index)
    track('storyboard_frame_downloaded', { index, filename })
    try {
      const res = await fetch(frame.url)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 800)
      toast.success(`Saved \u00b7 ${filename}`)
    } catch {
      // Cross-origin fetch can fail; fall back to opening in a new tab so the
      // creator can right-click → save without us touching the URL.
      window.open(frame.url, '_blank', 'noopener,noreferrer')
      toast.message('Opened in a new tab — long-press or right-click to save.')
    }
  }

  const copyPrompt = async () => {
    const prompt = frame.prompt
      || (frame.shotText ? buildFramePrompt(frame.shotText, index, frame.mood, undefined, frame.cameraStyle) : '')
      || (parseShots(storyboardText)[index] ? buildFramePrompt(parseShots(storyboardText)[index], index, frame.mood, undefined, frame.cameraStyle) : '')
    if (!prompt) { toast.error('Prompt not available for this frame.'); return }
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success('Prompt copied to clipboard')
      track('storyboard_frame_prompt_copied', { index })
    } catch {
      toast.error('Could not copy prompt')
    }
  }

  const busy = !!frame.regenerating

  return (
    <div
      title={frame.prompt?.slice(0, 240)}
      className="group relative block aspect-[9/16] rounded-lg overflow-hidden border border-white/[0.06] bg-black/40 hover:border-gold-500/40 transition"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={frame.url}
        alt={`Frame ${index + 1}`}
        loading="lazy"
        className={`w-full h-full object-cover transition duration-500 ${busy ? 'opacity-30 blur-[1px]' : 'group-hover:scale-[1.02]'}`}
      />

      {/* Frame number badge — always visible */}
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] tracking-[0.18em] uppercase text-gold-300/85 font-medium pointer-events-none">
        {label}
      </div>

      {/* Regen spinner overlay (replaces hover actions while busy) */}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="w-5 h-5 animate-spin text-gold-300" />
        </div>
      )}

      {/* Hover actions — subtle gradient + 3 icon buttons. Soft fade-in, low visual noise. */}
      {!busy && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 pointer-events-auto">
            <FrameAction
              label="Download"
              icon={Download}
              onClick={downloadFrame}
            />
            <FrameAction
              label="Regenerate"
              icon={RefreshCw}
              onClick={() => onRegenerate()}
            />
            <FrameAction
              label="Copy prompt"
              icon={Copy}
              onClick={copyPrompt}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function FrameAction({
  label, icon: Icon, onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick() }}
      title={label}
      aria-label={label}
      className="w-7 h-7 rounded-md bg-black/70 backdrop-blur-sm border border-white/[0.08] hover:border-gold-500/50 text-luxe/85 hover:text-gold-200 flex items-center justify-center transition"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

// =====================================================================
// Phase 3 — Cinematic Creator Cockpit helpers
// Compact muted icons, subtle hover glow, no analytics noise.
// =====================================================================
const NAV_ICONS = {
  home: Home,
  create: PenLine,
  scripts: FileText,
  storyboards: Film,
  voice: Mic,
  library: BookOpen,
  settings: SettingsIcon,
} as const

function NavLink({
  href, icon, label, active, soon,
}: {
  href: string
  icon: keyof typeof NAV_ICONS
  label: string
  active?: boolean
  soon?: boolean
}) {
  const Icon = NAV_ICONS[icon]
  const cls = active
    ? 'bg-gold-500/10 text-gold-200 ring-1 ring-gold-500/30'
    : 'text-luxe/70 hover:text-luxe hover:bg-white/[0.04]'
  const inner = (
    <>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {soon && (
        <span className="ml-auto text-[8.5px] tracking-[0.18em] uppercase text-luxe/35 font-normal">
          soon
        </span>
      )}
    </>
  )
  if (soon) {
    return (
      <div
        title="Coming soon"
        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] cursor-not-allowed opacity-70 ${cls}`}
      >
        {inner}
      </div>
    )
  }
  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12.5px] transition ${cls}`}
    >
      {inner}
    </Link>
  )
}

// Floating mascot — subtle idle glow, low presence, no motion library required.
function WorkspaceMascot() {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none fixed bottom-5 right-5 lg:right-[460px] xl:right-[520px] z-20 hidden md:block"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gold-500/20 blur-2xl animate-pulse" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/api/mascot"
          alt=""
          width={56}
          height={56}
          className="relative w-14 h-14 rounded-full object-cover ring-1 ring-gold-500/30 shadow-[0_0_30px_-6px_rgba(245,196,77,0.45)]"
        />
      </div>
    </div>
  )
}

// =====================================================================
// AI DIRECTOR CARD — Phase 3
// Lightweight cinematic intelligence panel. Everything shown is grounded
// in REAL workspace state (tone / mood / camera style / storyboard text /
// timing engine). No fake metrics, no fabricated scores, no charts.
// =====================================================================
function AIDirectorCard({
  tone, platform, output,
}: {
  tone: string
  platform: string
  output: GenOutput | null
}) {
  // Read mood + camera style from localStorage. Updates via custom event
  // dispatched by StoryboardFrames when the creator changes them.
  const [mood, setMood] = useState<string>('emotional_indie')
  const [cameraStyle, setCameraStyle] = useState<string>('intimate_handheld')

  useEffect(() => {
    const sync = () => {
      try {
        const m = window.localStorage.getItem(MOOD_STORAGE_KEY)
        const c = window.localStorage.getItem(CAMERA_STYLE_STORAGE_KEY)
        if (m && MOOD_BY_ID[m]) setMood(m)
        if (c && CAMERA_STYLE_BY_ID[c]) setCameraStyle(c)
      } catch {}
    }
    sync()
    const onChange = () => sync()
    window.addEventListener('storage', onChange)
    window.addEventListener('mugtee:directing-changed' as any, onChange)
    return () => {
      window.removeEventListener('storage', onChange)
      window.removeEventListener('mugtee:directing-changed' as any, onChange)
    }
  }, [])

  const storyboardText = output?.storyboard || ''
  const hasStoryboard = storyboardText.trim().length > 20

  // Story Feel — derived from tone.
  const toneLabel = TONES.find(t => t.value === tone)?.label || 'Cinematic'
  // Cinematic Tone — derived from current mood lock.
  const moodLabel = MOOD_BY_ID[mood]?.label || 'Emotional Indie'
  // Pacing Style — derived from camera style.
  const cameraLabel = CAMERA_STYLE_BY_ID[cameraStyle]?.label || 'Intimate Handheld'

  // Runtime + dominant pacing tag — both derived from the local timing engine.
  const { runtime, dominantTag } = useMemo(() => {
    if (!hasStoryboard) return { runtime: null as number | null, dominantTag: null as string | null }
    const blocks = parseAllShotBlocks(storyboardText)
    if (!blocks.length) return { runtime: null, dominantTag: null }
    const timings = blocks.map((s, i) => estimateShotTiming(s, i, blocks.length))
    const total = timings.reduce((sum, t) => sum + t.durationSeconds, 0)
    const tally: Record<string, number> = {}
    for (const t of timings) if (t.tag) tally[t.tag] = (tally[t.tag] || 0) + 1
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
    return { runtime: total, dominantTag: top ? top[0] : null }
  }, [storyboardText, hasStoryboard])

  // Frame readiness — derived from storyboard existence (no fake numbers).
  const frameReadiness = !hasStoryboard
    ? 'Awaiting storyboard'
    : 'Ready to generate'

  const platformLabel = PLATFORMS.find(p => p.value === platform)?.label || platform

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/30 backdrop-blur-xl p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-400/80 flex items-center gap-1.5">
          <Compass className="w-3 h-3" /> AI Director
        </p>
        <span className="text-[9.5px] tracking-[0.18em] uppercase text-luxe/40">
          {platformLabel}
        </span>
      </div>

      <p className="text-[11.5px] text-luxe/55 italic leading-snug">
        {hasStoryboard
          ? 'Detected from your current story:'
          : 'Mugtee will read your story\u2019s pacing, atmosphere and framing as it forms.'}
      </p>

      <dl className="space-y-2">
        <DirectorRow label="Story Feel"        value={toneLabel} />
        <DirectorRow label="Cinematic Tone"    value={moodLabel} />
        <DirectorRow label="Camera Framing"    value={cameraLabel} />
        <DirectorRow
          label="Pacing"
          value={hasStoryboard ? (dominantTag || 'Mixed cadence') : '\u2014'}
          muted={!hasStoryboard}
        />
        <DirectorRow
          label="Runtime"
          value={hasStoryboard && runtime ? `\u2248 ${runtime}s` : '\u2014'}
          muted={!hasStoryboard}
        />
        <DirectorRow
          label="Frames"
          value={frameReadiness}
          muted={!hasStoryboard}
        />
      </dl>
    </div>
  )
}

function DirectorRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[10px] tracking-[0.22em] uppercase text-luxe/40">{label}</dt>
      <dd className={`text-[11.5px] tracking-[0.02em] text-right ${muted ? 'text-luxe/35' : 'text-luxe/85'}`}>
        {value}
      </dd>
    </div>
  )
}


