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
  Copy, Download, FileType,
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
    track('workspace_generate_clicked', {
      platform, tone, duration,
      topic_length: topicLen,
      topic_length_bucket: topicLenBucket,
      used_starter_prompt: usedStarterPromptRef.current,
      from_template: usedStarterPromptRef.current, // back-compat alias
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
    } catch (e: any) {
      toast.error(e?.message || 'Could not save')
      track('workspace_save_failed', { error: String(e?.message || '').slice(0, 120) })
    } finally {
      setSaving(false)
    }
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
        <div className="space-y-1 mb-6">
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-400/80">Creator Workspace</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-luxe">
            From idea to reel — in one prompt.
          </h1>
          <p className="text-[13.5px] text-luxe/55 leading-relaxed max-w-xl">
            Type your idea, pick a platform, and Mugtee will draft the hook, full script,
            storyboard beats, captions and a thumbnail concept.
          </p>
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
          <OutputPanel output={output} loading={generating} tab={tab} setTab={setTab} onSave={saveProject} saving={saving} savedId={savedId} projectTitle={topic} />
        </div>
      </main>

      {/* RIGHT PANEL */}
      <aside className="hidden lg:flex lg:w-[420px] xl:w-[480px] lg:shrink-0 border-l border-white/[0.06] bg-black/30 backdrop-blur-xl flex-col">
        <div className="p-5 flex-1">
          <OutputPanel output={output} loading={generating} tab={tab} setTab={setTab} onSave={saveProject} saving={saving} savedId={savedId} projectTitle={topic} />
        </div>
      </aside>
    </div>
  )
}

function OutputPanel({
  output, loading, tab, setTab, onSave, saving, savedId, projectTitle,
}: {
  output: GenOutput | null
  loading: boolean
  tab: 'hook' | 'script' | 'storyboard' | 'captions' | 'thumbnail'
  setTab: (t: any) => void
  onSave: () => void
  saving: boolean
  savedId: string | null
  projectTitle?: string
}) {
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
            <OutputBody loading={loading} text={output ? output[key === 'thumbnail' ? 'thumbnailIdea' : key] : ''} />
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
        <Sparkles className="w-5 h-5 text-gold-400/50 mb-2" />
        <p className="text-[12.5px] text-luxe/45 max-w-[220px] leading-relaxed">
          Type an idea and hit <Badge variant="outline" className="mx-1 px-1.5 py-0 text-[10px] border-gold-500/30">Generate</Badge> to see results here.
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
