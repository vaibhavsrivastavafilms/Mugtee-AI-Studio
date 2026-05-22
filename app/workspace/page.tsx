'use client'
// Mugtee Workspace — cinematic 3-panel creator workspace.
// Reuses existing shadcn/ui primitives + the Mugtee gold/luxe theme. Zero new deps.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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

  // Load recent projects (reuse existing endpoint)
  useEffect(() => {
    let alive = true
    fetch('/api/projects/recent').then(r => r.json()).then(d => {
      if (alive && Array.isArray(d?.projects)) setRecents(d.projects.slice(0, 8))
    }).catch(() => {})
    return () => { alive = false }
  }, [savedId])

  const canGenerate = useMemo(() => topic.trim().length >= 6 && !generating, [topic, generating])

  const generate = async () => {
    if (!canGenerate) return
    setGenerating(true)
    setOutput(null)
    setSavedId(null)
    track('workspace_generate_clicked', { platform, tone, duration })
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
      track('workspace_generate_succeeded', { platform, tone, duration, mock: !!data.mock })
    } catch (e: any) {
      toast.error(e?.message || 'Something went wrong')
      track('workspace_generate_failed', { error: String(e?.message || '').slice(0, 120) })
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
      toast.success('Saved to your projects')
      track('workspace_project_saved', { platform })
    } catch (e: any) {
      toast.error(e?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const applyTemplate = (seed: string) => {
    setTopic(prev => prev ? prev : seed)
    track('workspace_template_applied', { seed: seed.slice(0, 40) })
  }

  const newProject = () => {
    setTopic(''); setOutput(null); setSavedId(null); setTab('hook')
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
              {recents.map(p => (
                <button key={p.id}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] text-[12.5px] text-luxe/85 hover:text-luxe transition flex items-center gap-2 group">
                  <Film className="w-3.5 h-3.5 text-gold-400/70 shrink-0" />
                  <span className="truncate">{p.title}</span>
                  <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-60 transition" />
                </button>
              ))}
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

        <Card className="p-4 md:p-5 bg-black/40 backdrop-blur-xl border-white/[0.06] space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Your idea</label>
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
          <OutputPanel output={output} loading={generating} tab={tab} setTab={setTab} onSave={saveProject} saving={saving} savedId={savedId} />
        </div>
      </main>

      {/* RIGHT PANEL */}
      <aside className="hidden lg:flex lg:w-[420px] xl:w-[480px] lg:shrink-0 border-l border-white/[0.06] bg-black/30 backdrop-blur-xl flex-col">
        <div className="p-5 flex-1">
          <OutputPanel output={output} loading={generating} tab={tab} setTab={setTab} onSave={saveProject} saving={saving} savedId={savedId} />
        </div>
      </aside>
    </div>
  )
}

function OutputPanel({
  output, loading, tab, setTab, onSave, saving, savedId,
}: {
  output: GenOutput | null
  loading: boolean
  tab: 'hook' | 'script' | 'storyboard' | 'captions' | 'thumbnail'
  setTab: (t: any) => void
  onSave: () => void
  saving: boolean
  savedId: string | null
}) {
  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-400/80 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Mugtee Output
        </p>
        {output && (
          <Button size="sm" variant="outline" onClick={onSave} disabled={saving || !!savedId}
            className="h-8 gap-1.5 text-[11.5px] border-gold-500/30 hover:border-gold-500/60 text-luxe hover:text-gold-200">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {savedId ? 'Saved' : 'Save project'}
          </Button>
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
    <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-luxe/90 font-sans rounded-xl border border-white/[0.06] bg-black/20 p-4 max-h-[480px] overflow-auto scrollbar-luxe">
      {text}
    </pre>
  )
}
