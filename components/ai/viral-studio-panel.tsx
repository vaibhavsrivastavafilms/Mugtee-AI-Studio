'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, ChevronRight, ChevronLeft, Wand2, Copy, Flame, Plus, Check, Clapperboard } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/state'
import { PLATFORM_META } from '@/lib/dummy-data'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/types'

export interface Idea { title: string; hook: string; angle: string }

export const TONES: { id: string; label: string }[] = [
  { id: 'cinematic_emotional', label: 'Cinematic Emotional' },
  { id: 'funny_relatable',    label: 'Funny Relatable' },
  { id: 'storytelling',       label: 'Storytelling' },
  { id: 'luxury_premium',     label: 'Luxury Premium' },
]

export const NICHES: { id: string; label: string }[] = [
  { id: 'restaurant', label: 'Restaurant / Food' },
  { id: 'fitness',    label: 'Fitness / Wellness' },
  { id: 'fashion',    label: 'Fashion' },
  { id: 'travel',     label: 'Travel' },
  { id: 'filmmaker',  label: 'Filmmaker' },
  { id: 'coach',      label: 'Coach / Mentor' },
  { id: 'education',  label: 'Education' },
  { id: 'luxury',     label: 'Luxury Brand' },
  { id: 'podcast',    label: 'Podcast' },
  { id: 'comedy',     label: 'Comedy / Meme' },
  { id: 'agency',     label: 'Agency / Studio' },
  { id: 'business',   label: 'Business / Founder' },
]

export const AUDIENCES: { id: string; label: string }[] = [
  { id: 'gen_z',         label: 'Gen Z' },
  { id: 'millennials',   label: 'Millennials' },
  { id: 'professionals', label: 'Professionals' },
  { id: 'luxury',        label: 'Luxury Audience' },
  { id: 'mass',          label: 'Mass Audience' },
  { id: 'students',      label: 'Students' },
  { id: 'creators',      label: 'Creators' },
]

// Tiny localStorage helpers — no abstractions, just inline access for the creator profile defaults
function readCreatorProfile(): { niche: string; audience: string } {
  if (typeof window === 'undefined') return { niche: 'restaurant', audience: 'mass' }
  try {
    return {
      niche:    localStorage.getItem('tt:creator:niche')    || 'restaurant',
      audience: localStorage.getItem('tt:creator:audience') || 'mass',
    }
  } catch { return { niche: 'restaurant', audience: 'mass' } }
}
function writeCreatorProfile(p: { niche?: string; audience?: string }) {
  if (typeof window === 'undefined') return
  try {
    if (p.niche)    localStorage.setItem('tt:creator:niche', p.niche)
    if (p.audience) localStorage.setItem('tt:creator:audience', p.audience)
  } catch {}
}
export { readCreatorProfile, writeCreatorProfile }

// =====================================================================
// SHARED HOOK — used by ViralStudioPanel (pipeline) + ViralQuickStart (dashboard)
// =====================================================================
export function useViralIdeas() {
  const { addContent, updateContent } = useStore()
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [tone, setTone] = useState<string>('cinematic_emotional')
  // Niche + audience seed from localStorage so the creator's profile is the default everywhere
  const seed = typeof window !== 'undefined' ? readCreatorProfile() : { niche: 'restaurant', audience: 'mass' }
  const [niche, setNicheInternal] = useState<string>(seed.niche)
  const [audience, setAudienceInternal] = useState<string>(seed.audience)
  const setNiche    = (n: string) => { setNicheInternal(n);    writeCreatorProfile({ niche: n }) }
  const setAudience = (a: string) => { setAudienceInternal(a); writeCreatorProfile({ audience: a }) }
  const [loading, setLoading] = useState(false)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [addedIds, setAddedIds] = useState<Record<number, string>>({})
  const [adding, setAdding] = useState<number | null>(null)
  const [scriptBusy, setScriptBusy] = useState<number | null>(null)
  const [scripts, setScripts] = useState<Record<number, string>>({})

  const generate = useCallback(async () => {
    const t = topic.trim()
    if (!t) { toast.error('Add a topic first'); return }
    setLoading(true); setIdeas([]); setAddedIds({}); setScripts({})
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ideas', context: { description: t, platform, tone, niche, audience } }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error || 'Generation failed'); return }
      const list = Array.isArray(data?.output?.ideas) ? data.output.ideas : []
      const cleaned: Idea[] = list
        .filter((x: any) => x && (x.title || x.hook))
        .map((x: any) => ({ title: String(x.title || ''), hook: String(x.hook || ''), angle: String(x.angle || '') }))
      setIdeas(cleaned)
      if (cleaned.length === 0) toast.error('No ideas parsed — try regenerating')
    } catch (e: any) {
      toast.error(e?.message || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }, [topic, platform, tone, niche, audience])

  const addToPipeline = useCallback(async (idea: Idea, index: number, statusOverride?: 'idea' | 'scripting'): Promise<string | undefined> => {
    if (addedIds[index] || adding === index) return addedIds[index]
    setAdding(index)
    const description = [idea.hook && `Hook: ${idea.hook}`, idea.angle && `Angle: ${idea.angle}`].filter(Boolean).join('\n\n')
    try {
      const id = await addContent({
        title: idea.title || 'Untitled idea',
        description: description || null,
        platform,
        status: statusOverride || 'idea',
      })
      if (id) setAddedIds(prev => ({ ...prev, [index]: id }))
      return id
    } catch (e: any) {
      toast.error(e?.message || 'Could not add to pipeline')
      return undefined
    } finally {
      setAdding(null)
    }
  }, [addContent, platform, addedIds, adding])

  const promoteToScript = useCallback(async (idea: Idea, index: number) => {
    if (scriptBusy === index) return
    setScriptBusy(index)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'reel_script',
          context: {
            title: idea.title,
            description: [idea.hook && `Hook: ${idea.hook}`, idea.angle && `Angle: ${idea.angle}`].filter(Boolean).join('\n'),
            platform, status: 'scripting', tone, niche, audience, existing_script: idea.hook,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error || 'Script generation failed'); return }
      const scriptText = typeof data.output === 'string' ? data.output : (data.raw || '')
      if (!scriptText) { toast.error('Empty script returned'); return }

      let contentId = addedIds[index]
      if (!contentId) contentId = await addToPipeline(idea, index, 'scripting')
      if (!contentId) { toast.error('Could not attach script'); return }

      await updateContent(contentId, { script: scriptText, status: 'scripting' } as any)
      setScripts(prev => ({ ...prev, [index]: scriptText }))
    } catch (e: any) {
      toast.error(e?.message || 'Script generation failed')
    } finally {
      setScriptBusy(null)
    }
  }, [scriptBusy, platform, tone, niche, audience, addedIds, addToPipeline, updateContent])

  return {
    topic, setTopic, platform, setPlatform, tone, setTone,
    niche, setNiche, audience, setAudience,
    loading, ideas, addedIds, adding, scriptBusy, scripts,
    generate, addToPipeline, promoteToScript,
  }
}

// =====================================================================
// FULL SIDE PANEL (pipeline)
// =====================================================================
export function ViralStudioPanel() {
  const [open, setOpen] = useState(true)
  const v = useViralIdeas()

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:20}}
            onClick={() => setOpen(true)}
            className="sticky top-24 self-start shrink-0 ml-auto group flex flex-col items-center gap-3 px-2 py-4 rounded-l-2xl glass border border-r-0 border-gold-soft hover:border-gold-500/40 transition-colors"
            aria-label="Open TT VIRAL Studio"
          >
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 [writing-mode:vertical-rl] rotate-180">TT Viral</span>
            <ChevronLeft className="w-3.5 h-3.5 text-gold-300/60 group-hover:text-gold-300" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            key="panel"
            initial={{opacity:0, x:30, width:0}} animate={{opacity:1, x:0, width:360}} exit={{opacity:0, x:30, width:0}}
            transition={{type:'spring', damping:24, stiffness:200}}
            className="sticky top-24 self-start shrink-0 max-h-[calc(100vh-120px)] overflow-hidden flex flex-col rounded-2xl glass border border-gold-soft shadow-cinema"
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-white/[0.05]">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
                  <Sparkles className="w-3 h-3" /> TT Viral
                </div>
                <h3 className="font-display text-xl mt-1 text-gold-gradient truncate">Studio</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Generate viral idea seeds for the pipeline.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-gold-300 transition" aria-label="Collapse">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-luxe p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Topic</label>
                <Input
                  value={v.topic}
                  onChange={(e) => v.setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !v.loading) v.generate() }}
                  placeholder="e.g. late-night chai with friends"
                  className="bg-white/[0.03] focus-visible:ring-gold-500/40 focus-visible:border-gold-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Niche</label>
                  <Select value={v.niche} onValueChange={v.setNiche}>
                    <SelectTrigger className="bg-white/[0.03] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NICHES.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Audience</label>
                  <Select value={v.audience} onValueChange={v.setAudience}>
                    <SelectTrigger className="bg-white/[0.03] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Platform</label>
                  <Select value={v.platform} onValueChange={(p) => v.setPlatform(p as Platform)}>
                    <SelectTrigger className="bg-white/[0.03] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORM_META).map(([k, val]) => <SelectItem key={k} value={k}>{val.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Tone</label>
                  <Select value={v.tone} onValueChange={v.setTone}>
                    <SelectTrigger className="bg-white/[0.03] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={v.generate} disabled={v.loading || !v.topic.trim()}
                className="w-full h-10 bg-gold-gradient text-black gap-2 shadow-gold-glow hover:opacity-90">
                {v.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {v.loading ? 'Generating…' : 'Generate Ideas'}
              </Button>

              {v.loading && (
                <div className="space-y-2 pt-2">
                  {[0,1,2].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              )}

              {!v.loading && v.ideas.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 flex items-center gap-1.5">
                    <Flame className="w-3 h-3" /> {v.ideas.length} ideas
                  </div>
                  {v.ideas.map((idea, i) => (
                    <IdeaCard key={i} idea={idea} index={i}
                      isAdded={!!v.addedIds[i]} isAdding={v.adding === i}
                      scriptBusy={v.scriptBusy === i} scriptText={v.scripts[i]}
                      onAdd={() => v.addToPipeline(idea, i)}
                      onPromote={() => v.promoteToScript(idea, i)}
                    />
                  ))}
                </div>
              )}

              {!v.loading && v.ideas.length === 0 && (
                <div className="text-center py-10 text-luxe/50 text-xs">
                  <Wand2 className="w-7 h-7 mx-auto mb-2 text-gold-400/30" />
                  Idea seeds appear here.<br/>Pipeline insertion coming next.
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

// =====================================================================
// IDEA CARD — exported for reuse on dashboard hero
// =====================================================================
export function IdeaCard({
  idea, index, isAdded, isAdding, scriptBusy, scriptText, onAdd, onPromote, compact,
}: {
  idea: Idea; index: number;
  isAdded: boolean; isAdding: boolean;
  scriptBusy: boolean; scriptText?: string;
  onAdd: () => void; onPromote: () => void;
  compact?: boolean
}) {
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied') }
  const scriptReady = !!scriptText
  const previewLines = scriptText ? scriptText.split('\n').filter(Boolean).slice(0, 4) : []
  return (
    <motion.div
      initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{delay: index*0.04}}
      className={cn(
        'group rounded-xl p-3 bg-gradient-to-br from-white/[0.05] to-white/[0.01] border transition',
        scriptReady ? 'border-violet-500/40 bg-violet-500/[0.04]' :
        isAdded ? 'border-emerald-500/40 bg-emerald-500/[0.04]' :
        'border-white/[0.06] hover:border-gold-500/40',
      )}
    >
      <div className="flex items-start gap-2">
        <span className="font-display text-[10px] text-gold-400/80 tracking-widest mt-0.5">{String(index+1).padStart(2,'0')}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{idea.title}</div>
          {idea.hook && (
            <div className="text-[12px] italic text-luxe/80 mt-1.5 leading-snug">“{idea.hook}”</div>
          )}
          {idea.angle && !compact && (
            <div className="text-[10px] tracking-wide text-gold-300/80 mt-1.5 leading-snug">
              <span className="text-gold-400/60">▸ </span>{idea.angle}
            </div>
          )}
        </div>
        <button
          onClick={() => copy(`${idea.title}\n\nHook: ${idea.hook}\nAngle: ${idea.angle}`)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-gold-300 transition shrink-0"
          aria-label="Copy idea"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>

      <AnimatePresence>
        {scriptReady && !compact && (
          <motion.div
            initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}}
            className="mt-3 pt-2.5 border-t border-violet-500/20 overflow-hidden"
          >
            <div className="text-[10px] tracking-[0.3em] uppercase text-violet-300/80 flex items-center gap-1.5 mb-1.5">
              <Clapperboard className="w-3 h-3" /> Script preview
            </div>
            <div className="space-y-1">
              {previewLines.map((line, i) => (
                <div key={i} className="text-[11px] text-luxe/85 font-mono leading-snug truncate">{line}</div>
              ))}
              {scriptText && scriptText.split('\n').filter(Boolean).length > 4 && (
                <div className="text-[10px] text-muted-foreground italic">…opened in pipeline card</div>
              )}
            </div>
            <button
              onClick={() => copy(scriptText!)}
              className="mt-2 text-[10px] tracking-[0.2em] uppercase text-violet-300/80 hover:text-violet-200 inline-flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy full script
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-end gap-1.5">
        <AnimatePresence mode="wait" initial={false}>
          {isAdded ? (
            <motion.div key="added"
              initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0}}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-emerald-300" title="In pipeline">
              <Check className="w-3 h-3" /> In pipeline
            </motion.div>
          ) : (
            <motion.button key="add"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={onAdd}
              disabled={isAdding}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] tracking-[0.2em] uppercase bg-gold-500/15 hover:bg-gold-500/25 text-gold-200 ring-1 ring-gold-500/30 transition disabled:opacity-50 disabled:cursor-wait"
            >
              {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {isAdding ? 'Adding…' : 'Add'}
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={onPromote}
          disabled={scriptBusy}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] tracking-[0.2em] uppercase transition disabled:opacity-60 disabled:cursor-wait ring-1',
            scriptReady ? 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 ring-violet-500/40'
                        : 'bg-gold-gradient text-black hover:opacity-90 ring-transparent shadow-gold-glow',
          )}
          title="Generate cinematic script"
        >
          {scriptBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clapperboard className="w-3 h-3" />}
          {scriptBusy ? 'Generating…' : scriptReady ? 'Regenerate' : 'Script'}
        </button>
      </div>

      <AnimatePresence>
        {scriptBusy && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="mt-2 text-[10px] tracking-[0.2em] uppercase text-gold-400/80 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 animate-pulse" /> Generating cinematic script…
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {scriptReady && !scriptBusy && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            className="mt-2 text-[10px] tracking-[0.2em] uppercase text-violet-300 flex items-center gap-1.5">
            <Check className="w-3 h-3" /> Script ready · saved to scripting
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
