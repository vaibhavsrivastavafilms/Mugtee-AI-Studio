'use client'
// Phase 13D — Faceless AI Engine (deep research · reference analyzer · cinematic script · flow prompts)
// Phase 13F — Auto-persists generated scripts as content_pieces (existing infra) + Recent AI Sessions panel.
// Reuses /api/ai/generate + existing store.addContent for pipeline insertion. No new infra.

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Brain, Sparkles, FileText, Eye, Wand2, Loader2, Plus, Film, Copy, Check, ExternalLink, History, Clock, Youtube, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useUsage, UpgradeModal } from '@/lib/usage'
import { toast } from 'sonner'
import { formatDistanceToNow, parseISO } from 'date-fns'
import type { ContentPiece, Platform } from '@/lib/types'

type Tab = 'research' | 'analyze' | 'script' | 'flow' | 'yt'
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'yt',       label: 'YouTube Intel',    icon: Youtube },
  { id: 'research', label: 'Deep Research',    icon: Brain },
  { id: 'analyze',  label: 'Reference Analyzer', icon: Eye },
  { id: 'script',   label: 'Cinematic Script', icon: FileText },
  { id: 'flow',     label: 'Flow Prompts',     icon: Wand2 },
]

const SCRIPT_FLAVORS: { id: string; label: string }[] = [
  { id: 'faceless_script',    label: 'Faceless YouTube' },
  { id: 'documentary_script', label: 'Documentary' },
  { id: 'cinematic_story',    label: 'Cinematic Story' },
  { id: 'retention_script',   label: 'Retention-Engineered' },
]

function readCreatorProfile() {
  if (typeof window === 'undefined') return { niche: 'education', audience: 'creators' }
  try {
    return {
      niche:    localStorage.getItem('tt:creator:niche')    || 'education',
      audience: localStorage.getItem('tt:creator:audience') || 'creators',
    }
  } catch { return { niche: 'education', audience: 'creators' } }
}

export function FacelessStudioDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addContent, content } = useStore()
  const { guard, bump, upgradeOpen, setUpgradeOpen, upgradeReason } = useUsage()
  const seed = readCreatorProfile()
  const [tab, setTab] = useState<Tab>('yt')

  // Shared
  const [niche, setNiche]       = useState(seed.niche)
  const [audience, setAudience] = useState(seed.audience)
  const [language, setLanguage] = useState('english')

  // Research
  const [topic, setTopic]       = useState('')
  const [research, setResearch] = useState<any | null>(null)
  const [rLoading, setRLoading] = useState(false)

  // Reference analyzer
  const [refText, setRefText]   = useState('')
  const [refResult, setRefResult] = useState<any | null>(null)
  const [aLoading, setALoading] = useState(false)

  // Script
  const [scriptTitle, setScriptTitle] = useState('')
  const [scriptFlavor, setScriptFlavor] = useState('faceless_script')
  const [scriptDur, setScriptDur]   = useState(180)
  const [scriptOut, setScriptOut]   = useState<string>('')
  const [scriptModel, setScriptModel] = useState<string>('')
  const [sLoading, setSLoading] = useState(false)
  // Phase 13F — auto-persist + workspace link
  const [savedScriptId, setSavedScriptId] = useState<string | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)

  // Flow prompts
  const [flowSrc, setFlowSrc]   = useState('')
  const [flowOut, setFlowOut]   = useState<any | null>(null)
  const [fLoading, setFLoading] = useState(false)

  // Phase 14 — YouTube Intelligence
  const [channel, setChannel]   = useState('')
  const [ytOut, setYtOut]       = useState<any | null>(null)
  const [yLoading, setYLoading] = useState(false)

  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  // Track last error per surface so we can show inline Retry buttons (P1 polish — graceful errors).
  const [lastErr, setLastErr] = useState<{ tab: Tab; msg: string } | null>(null)
  const retry = () => {
    if (!lastErr) return
    setLastErr(null)
    if (lastErr.tab === 'research') runResearch()
    else if (lastErr.tab === 'analyze') runAnalyze()
    else if (lastErr.tab === 'script') runScript()
    else if (lastErr.tab === 'flow') runFlow()
    else if (lastErr.tab === 'yt') runYt()
  }

  const callAI = async (body: any) => {
    const res = await fetch('/api/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await res.json()
    if (!res.ok || d.error) throw new Error(d.error || 'AI call failed')
    return d
  }

  const runResearch = async () => {
    if (!topic.trim()) { toast.error('Enter a topic'); return }
    if (!guard('ai')) return
    setRLoading(true); setResearch(null)
    try { const d = await callAI({ mode: 'deep_research', context: { topic, niche, audience, language, platform: 'youtube' } }); setResearch(d.output); bump('ai') }
    catch (e:any) { const msg = e?.message || 'Research failed'; setLastErr({ tab: 'research', msg }); toast.error(msg) }
    finally { setRLoading(false) }
  }

  const runAnalyze = async () => {
    if (!refText.trim()) { toast.error('Paste a reference script'); return }
    if (!guard('ai')) return
    setALoading(true); setRefResult(null)
    try { const d = await callAI({ mode: 'reference_analysis', context: { reference_script: refText, niche, audience, language, platform: 'youtube' } }); setRefResult(d.output); bump('ai') }
    catch (e:any) { const msg = e?.message || 'Analysis failed'; setLastErr({ tab: 'analyze', msg }); toast.error(msg) }
    finally { setALoading(false) }
  }

  const runScript = async () => {
    if (!scriptTitle.trim()) { toast.error('Enter a title or topic'); return }
    if (!guard('scripts')) return
    setSLoading(true); setScriptOut(''); setScriptModel(''); setSavedScriptId(null); setLastErr(null)
    try {
      const d = await callAI({ mode: scriptFlavor, context: { title: scriptTitle, niche, audience, language, platform: 'youtube', duration_seconds: scriptDur } })
      const out = d.output || ''
      setScriptOut(out); setScriptModel(d.model || '')
      bump('scripts')
      // Phase 13F — auto-persist as a content_pieces row so it survives logout/refresh and shows in Recent AI Sessions + Pipeline.
      if (out) {
        setAutoSaving(true)
        try {
          const id = await addContent({
            title: scriptTitle,
            description: `[${scriptFlavor} · ${d.model || 'gpt'} · ${scriptDur}s] ${out.slice(0, 200)}…`,
            platform: 'youtube' as Platform,
            status: 'idea',
            tags: ['faceless', scriptFlavor, 'ai_session'],
            script: out,
          } as Partial<ContentPiece> as any)
          if (id) setSavedScriptId(id)
        } catch { /* non-fatal — script still visible in dialog */ }
        finally { setAutoSaving(false) }
      }
    }
    catch (e:any) {
      const msg = e?.message || 'Script generation failed'
      setLastErr({ tab: 'script', msg })
      toast.error(msg)
    }
    finally { setSLoading(false) }
  }

  const runFlow = async () => {
    const src = flowSrc.trim() || scriptOut
    if (!src) { toast.error('Generate or paste a script first'); return }
    if (!guard('ai')) return
    setFLoading(true); setFlowOut(null)
    try { const d = await callAI({ mode: 'flow_prompts', context: { script_input: src, niche, audience, language, platform: 'youtube' } }); setFlowOut(d.output); bump('ai') }
    catch (e:any) { const msg = e?.message || 'Flow prompts failed'; setLastErr({ tab: 'flow', msg }); toast.error(msg) }
    finally { setFLoading(false) }
  }

  const runYt = async () => {
    const c = channel.trim()
    if (!c) { toast.error('Enter a channel name or URL'); return }
    if (!guard('ai')) return
    setYLoading(true); setYtOut(null)
    try {
      const d = await callAI({ mode: 'youtube_intelligence', context: { channel: c, niche, audience, language, platform: 'youtube' } })
      const out = d.output
      setYtOut(out)
      bump('ai')
      // Phase 14 — auto-persist YT intel as a content row so it appears in Recent AI Sessions + survives logout.
      if (out && out.channel_name) {
        try {
          await addContent({
            title: `YT Intel · ${out.channel_name}`,
            description: `[youtube_intelligence] ${out.why_it_works || ''}`.slice(0, 800),
            platform: 'youtube' as Platform,
            status: 'idea',
            tags: ['ai_session', 'youtube_intelligence', 'faceless'],
            script: JSON.stringify(out, null, 2),
          } as Partial<ContentPiece> as any)
        } catch { /* non-fatal */ }
      }
    }
    catch (e:any) { const msg = e?.message || 'Intelligence call failed'; setLastErr({ tab: 'yt', msg }); toast.error(msg) }
    finally { setYLoading(false) }
  }

  const addToPipeline = async (title: string, description: string, tags: string[]) => {
    try {
      await addContent({ title, description, platform: 'youtube' as Platform, status: 'idea', tags } as Partial<ContentPiece>)
      toast.success('Added to pipeline')
    } catch (e:any) { toast.error(e?.message || 'Could not add') }
  }

  // Phase 13F — Recent AI Sessions: filter store.content to AI-generated pieces, latest first.
  // Realtime-safe (store already subscribes to content_pieces changes), survives logout/login automatically.
  const recentSessions = useMemo(() => {
    return (content || [])
      .filter((c: any) => (c.tags || []).includes('ai_session') || ((c as any).script && (c.tags || []).includes('faceless')))
      .slice()
      .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 8)
  }, [content])
  const reopenSession = (id: string) => {
    try { window.open(`/script/${id}`, '_blank', 'noopener') } catch { window.location.href = `/script/${id}` }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
            <Brain className="w-3 h-3" /> Faceless Intelligence Engine
          </div>
          <DialogTitle className="font-display text-2xl sm:text-3xl">
            <span className="text-gold-gradient">Faceless</span> AI Studio
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">Research · Analyze · Script · Visualize — built for storytelling intelligence, not cloning.</p>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex flex-nowrap gap-1.5 mt-1 -mb-1 overflow-x-auto scrollbar-luxe pb-1 -mx-1 px-1">
          {TABS.map(t => {
            const TIcon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] tracking-wide transition-colors duration-200 shrink-0',
                  active ? 'bg-gold-500/15 border border-gold-500/40 text-gold-200' : 'bg-white/[0.02] border border-white/[0.06] text-muted-foreground hover:text-foreground'
                )}
              >
                <TIcon className="w-3.5 h-3.5" /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Shared mini context strip */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div><label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Niche</label><Input value={niche} onChange={e => setNiche(e.target.value)} className="bg-white/[0.03] h-8 text-xs mt-1" /></div>
          <div><label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Audience</label><Input value={audience} onChange={e => setAudience(e.target.value)} className="bg-white/[0.03] h-8 text-xs mt-1" /></div>
          <div>
            <label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-white/[0.03] h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['english','hinglish','gujarati','guj_hindi','auto'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* P1 polish — inline graceful error with one-click Retry */}
        {lastErr && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-500/[0.08] border border-red-500/30">
            <span className="text-red-300 mt-0.5">⚠</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-red-200">Something didn&apos;t work</div>
              <div className="text-[11px] text-red-200/80 mt-0.5 truncate">{lastErr.msg}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button onClick={retry} className="h-7 px-2.5 text-[11px] bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 gap-1.5">
                <Loader2 className="w-3 h-3" /> Retry
              </Button>
              <button onClick={() => setLastErr(null)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Dismiss"><Check className="w-3 h-3" /></button>
            </div>
          </div>
        )}

        {/* YOUTUBE INTELLIGENCE */}
        {tab === 'yt' && (
          <div className="space-y-3 pt-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={channel} onChange={e => setChannel(e.target.value)} placeholder="@MrBeast · Veritasium · or paste a channel URL" className="bg-white/[0.03] flex-1" />
              <Button onClick={runYt} disabled={yLoading} className="bg-gold-gradient text-black gap-2 shrink-0 sm:w-auto w-full">
                {yLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}{yLoading ? 'Analyzing…' : 'Analyze channel'}
              </Button>
            </div>
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground p-2 rounded-md bg-white/[0.02] border border-white/[0.05]">
              <BarChart3 className="w-3 h-3 mt-0.5 text-gold-400/70 shrink-0" />
              <span>AI-only analysis based on public knowledge. Stats marked &quot;(est)&quot; are inferred. No scraping. Auto-saved to Recent AI Sessions.</span>
            </div>

            {ytOut && (
              <div className="rounded-xl glass border border-gold-soft p-4 space-y-3">
                <div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80 mb-1">{ytOut.niche}</div>
                  <h3 className="font-display text-2xl leading-tight">{ytOut.channel_name}</h3>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Stat label="Subscribers" value={ytOut.subscriber_count} />
                  <Stat label="Upload freq" value={ytOut.upload_frequency} />
                  <Stat label="Avg length"  value={ytOut.avg_video_length} />
                  <Stat label="Momentum"    value={(ytOut.growth_momentum || '').split('—')[0]?.trim() || ytOut.growth_momentum} />
                </div>

                {/* Why it works */}
                {ytOut.why_it_works && (
                  <div className="p-3 rounded-lg bg-gold-500/[0.06] border border-gold-500/20">
                    <div className="text-[10px] tracking-[0.25em] uppercase text-gold-300 mb-1.5">Why it works</div>
                    <div className="text-[12px] text-luxe/90 leading-relaxed">{ytOut.why_it_works}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ResearchSection title="Viral Patterns" items={ytOut.viral_patterns} />
                  <ResearchSection title="Faceless Opportunities" items={ytOut.faceless_opportunities} />
                  <ResearchSection title="Title Psychology"     items={ytOut.title_psychology} />
                  <ResearchSection title="Thumbnail Psychology" items={ytOut.thumbnail_psychology} />
                </div>

                <ResearchSection title="Viral Story Structure" items={ytOut.viral_story_structure} ordered />

                {/* Recommended formats */}
                {Array.isArray(ytOut.recommended_formats) && ytOut.recommended_formats.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.25em] uppercase text-gold-300/80 mb-1.5">Recommended Formats</div>
                    <div className="space-y-1.5">
                      {ytOut.recommended_formats.map((f:any, i:number) => (
                        <button key={i}
                          onClick={() => { setScriptTitle(f.example_title || f.format); setTab('script') }}
                          title="Build a script from this format"
                          className="w-full text-left p-2.5 rounded-lg bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] hover:border-gold-500/30 transition-colors group"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[12px] font-medium text-luxe">{f.format}</span>
                            <span className="text-[9px] tracking-widest uppercase text-gold-300 opacity-0 group-hover:opacity-100 transition-opacity">→ Build script</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-snug">{f.why}</div>
                          {f.example_title && <div className="text-[11px] text-gold-300/80 italic mt-1 truncate">e.g. &quot;{f.example_title}&quot;</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DEEP RESEARCH */}
        {tab === 'research' && (
          <div className="space-y-3 pt-3">
            <div className="flex gap-2">
              <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. how the Antikythera mechanism worked" className="bg-white/[0.03] flex-1" />
              <Button onClick={runResearch} disabled={rLoading} className="bg-gold-gradient text-black gap-2 shrink-0">
                {rLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}{rLoading ? 'Researching…' : 'Research'}
              </Button>
            </div>
            {research && (
              <div className="rounded-xl glass border border-gold-soft p-4 space-y-3">
                <div><div className="text-[10px] tracking-[0.25em] uppercase text-gold-300 mb-1">Thesis</div><div className="text-sm text-luxe leading-snug italic">{research.thesis}</div></div>
                <ResearchSection title="Research Breakdown" items={research.research_breakdown} />
                <ResearchSection title="Rare Facts"          items={research.rare_facts} />
                <ResearchSection title="Emotional Angles"    items={research.emotional_angles} />
                <ResearchSection title="Viral Hooks"         items={research.viral_hooks} />
                <ResearchSection title="Thumbnail Psychology" items={research.thumbnail_psychology} />
                <ResearchSection title="Documentary Structure" items={research.documentary_structure} ordered />
                <ResearchSection title="Comparisons & Metaphors" items={research.comparisons_metaphors} />
                <ResearchSection title="Controversies / Future" items={research.controversies_or_future} />
                <div className="flex gap-2 pt-2 border-t border-white/[0.05]">
                  <Button onClick={() => addToPipeline(topic, `Thesis: ${research.thesis}\n\nViral Hooks:\n- ${(research.viral_hooks||[]).join('\n- ')}\n\nDocumentary Structure:\n- ${(research.documentary_structure||[]).join('\n- ')}`, ['research','faceless','documentary'])} className="bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 h-8 gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Add Research to Pipeline
                  </Button>
                  <Button onClick={() => { setScriptTitle(topic); setTab('script') }} variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-gold-300">→ Build script from this</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REFERENCE ANALYZER */}
        {tab === 'analyze' && (
          <div className="space-y-3 pt-3">
            <Textarea value={refText} onChange={e => setRefText(e.target.value)} rows={6} placeholder="Paste a reference script here — we'll extract the mechanics, never copy the content." className="bg-white/[0.03] text-xs font-mono" />
            <div className="flex justify-end">
              <Button onClick={runAnalyze} disabled={aLoading} className="bg-gold-gradient text-black gap-2">
                {aLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}{aLoading ? 'Analyzing…' : 'Analyze'}
              </Button>
            </div>
            {refResult && (
              <div className="rounded-xl glass border border-gold-soft p-4 space-y-3">
                <div><div className="text-[10px] tracking-[0.25em] uppercase text-gold-300 mb-1">Verdict</div><div className="text-sm text-luxe italic">{refResult.verdict}</div></div>
                <div><div className="text-[10px] tracking-[0.25em] uppercase text-gold-300/80 mb-1">Hook Structure</div><div className="text-[12px] text-luxe/85">{refResult.hook_structure}</div></div>
                <ResearchSection title="Pacing"               items={refResult.pacing} />
                <ResearchSection title="Retention Psychology" items={refResult.retention_psychology} />
                <ResearchSection title="Emotional Rhythm"     items={refResult.emotional_rhythm} />
                <ResearchSection title="Sentence Style"       items={refResult.sentence_style} />
                <ResearchSection title="Curiosity Loops"      items={refResult.curiosity_loops} />
                <ResearchSection title="Cliffhangers"         items={refResult.cliffhangers} />
                <ResearchSection title="Storytelling Mechanics" items={refResult.storytelling_mechanics} />
              </div>
            )}
          </div>
        )}

        {/* CINEMATIC SCRIPT */}
        {tab === 'script' && (
          <div className="space-y-3 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_120px_auto] gap-2 items-end">
              <div><label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Title / Topic</label><Input value={scriptTitle} onChange={e => setScriptTitle(e.target.value)} placeholder="e.g. the night Alexandria burned" className="bg-white/[0.03] mt-1" /></div>
              <div><label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Flavor</label>
                <Select value={scriptFlavor} onValueChange={setScriptFlavor}>
                  <SelectTrigger className="bg-white/[0.03] h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SCRIPT_FLAVORS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Duration (s)</label><Input type="number" min={30} max={600} step={30} value={scriptDur} onChange={e => setScriptDur(Math.max(30, Math.min(600, Number(e.target.value)||180)))} className="bg-white/[0.03] mt-1 h-9 text-xs" /></div>
              <Button onClick={runScript} disabled={sLoading} className="bg-gold-gradient text-black gap-2 h-9">{sLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{sLoading ? 'Writing…' : 'Generate'}</Button>
            </div>
            {scriptOut && (
              <div className="rounded-xl glass border border-gold-soft p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[10px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center gap-2">
                    Script · {scriptModel || 'gpt-4o-mini'}
                    {autoSaving && <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground"><Loader2 className="w-2.5 h-2.5 animate-spin" /> saving</span>}
                    {savedScriptId && !autoSaving && <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400/80"><Check className="w-2.5 h-2.5" /> saved</span>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => copy('script', scriptOut)} className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 inline-flex items-center gap-1">
                      {copied === 'script' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                    </button>
                    {savedScriptId && (
                      <a href={`/script/${savedScriptId}`} target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-wider uppercase text-gold-300 hover:text-gold-200 inline-flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Open workspace
                      </a>
                    )}
                    <button onClick={() => { setFlowSrc(scriptOut); setTab('flow') }} className="text-[10px] tracking-wider uppercase text-gold-300 hover:text-gold-200">→ Visual prompts</button>
                  </div>
                </div>
                <pre className="text-[12px] leading-relaxed text-luxe/90 whitespace-pre-wrap font-mono max-h-72 overflow-y-auto scrollbar-luxe">{scriptOut}</pre>
                {!savedScriptId && (
                  <div className="flex gap-2 pt-2 border-t border-white/[0.05]">
                    <Button onClick={() => addToPipeline(scriptTitle, scriptOut, ['faceless', scriptFlavor])} className="bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 h-8 gap-1.5 text-xs">
                      <Plus className="w-3.5 h-3.5" /> Add Script to Pipeline
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* FLOW PROMPTS */}
        {tab === 'flow' && (
          <div className="space-y-3 pt-3">
            <Textarea value={flowSrc} onChange={e => setFlowSrc(e.target.value)} rows={5} placeholder="Paste a script — or generate one in the Cinematic Script tab and we'll pull it here." className="bg-white/[0.03] text-xs font-mono" />
            <div className="flex justify-end">
              <Button onClick={runFlow} disabled={fLoading} className="bg-gold-gradient text-black gap-2"><Wand2 className="w-4 h-4" />{fLoading ? 'Visualizing…' : 'Generate Flow Prompts'}</Button>
            </div>
            {flowOut && (
              <div className="rounded-xl glass border border-gold-soft p-4 space-y-2">
                <div className="text-[10px] tracking-[0.25em] uppercase text-gold-300">Style · {flowOut.style_summary}</div>
                <div className="space-y-1.5 mt-2">
                  {(flowOut.scene_prompts || []).map((p:any, i:number) => (
                    <div key={i} className="group flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-[9px] tracking-widest uppercase text-gold-400/80 mt-0.5 shrink-0 w-16">{p.type}</span>
                      <span className="text-[12px] text-luxe/85 flex-1 leading-snug">{p.prompt}</span>
                      <button onClick={() => copy('p'+i, p.prompt)} className="opacity-0 group-hover:opacity-100 text-[10px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 inline-flex items-center gap-1 transition-opacity">
                        {copied === 'p'+i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 13F — Recent AI Sessions (persistent, realtime-synced via store) */}
        {recentSessions.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/[0.05]">
            <div className="flex items-center gap-1.5 mb-2.5">
              <History className="w-3.5 h-3.5 text-gold-400/80" />
              <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300">Recent AI Sessions · {recentSessions.length}</span>
              <span className="text-[10px] text-muted-foreground ml-2">saved automatically — survives logout</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentSessions.map((s: any) => {
                const flavor = (s.tags || []).find((t: string) => t.endsWith('_script') || t === 'documentary_script') || 'script'
                const created = s.created_at ? formatDistanceToNow(parseISO(s.created_at), { addSuffix: true }) : ''
                return (
                  <button key={s.id} onClick={() => reopenSession(s.id)}
                    className="group text-left p-3 rounded-lg bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] hover:border-gold-500/30 transition-colors duration-200">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-[10px] tracking-widest uppercase text-gold-400/70">{flavor.replace(/_/g, ' ')}</div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground/60 group-hover:text-gold-300 transition" />
                    </div>
                    <div className="text-[13px] font-medium leading-snug line-clamp-1">{s.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {created}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </>
  )
}

function ResearchSection({ title, items, ordered = false }: { title: string; items?: string[]; ordered?: boolean }) {
  if (!items || !items.length) return null
  return (
    <div>
      <div className="text-[10px] tracking-[0.25em] uppercase text-gold-300/80 mb-1.5">{title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[12px] text-luxe/85 leading-snug pl-3 relative">
            <span className="absolute left-0 top-2 w-1 h-1 rounded-full bg-gold-400/60" />
            {ordered ? <span className="text-gold-400/60 mr-1.5">{i + 1}.</span> : null}{it}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
      <div className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-luxe mt-0.5 truncate">{value || '—'}</div>
    </div>
  )
}
