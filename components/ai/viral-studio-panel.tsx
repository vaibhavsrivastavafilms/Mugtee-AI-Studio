'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, ChevronRight, ChevronLeft, Wand2, Copy, Flame } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/state'
import { PLATFORM_META } from '@/lib/dummy-data'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/types'

interface Idea { title: string; hook: string; angle: string }

const TONES: { id: string; label: string }[] = [
  { id: 'cinematic_emotional', label: 'Cinematic Emotional' },
  { id: 'funny_relatable',    label: 'Funny Relatable' },
  { id: 'storytelling',       label: 'Storytelling' },
  { id: 'luxury_premium',     label: 'Luxury Premium' },
]

export function ViralStudioPanel() {
  const [open, setOpen] = useState(true)
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [tone, setTone] = useState<string>('cinematic_emotional')
  const [loading, setLoading] = useState(false)
  const [ideas, setIdeas] = useState<Idea[]>([])

  const generate = useCallback(async () => {
    const t = topic.trim()
    if (!t) { toast.error('Add a topic first'); return }
    setLoading(true); setIdeas([])
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ideas', context: { description: t, platform, tone } }),
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
  }, [topic, platform, tone])

  return (
    <>
      {/* Collapsed thin rail */}
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

      {/* Expanded panel */}
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
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !loading) generate() }}
                  placeholder="e.g. late-night chai with friends"
                  className="bg-white/[0.03] focus-visible:ring-gold-500/40 focus-visible:border-gold-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Platform</label>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                    <SelectTrigger className="bg-white/[0.03] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORM_META).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="bg-white/[0.03] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={generate} disabled={loading || !topic.trim()}
                className="w-full h-10 bg-gold-gradient text-black gap-2 shadow-gold-glow hover:opacity-90">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Generating…' : 'Generate Ideas'}
              </Button>

              {loading && (
                <div className="space-y-2 pt-2">
                  {[0,1,2].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              )}

              {!loading && ideas.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 flex items-center gap-1.5">
                    <Flame className="w-3 h-3" /> {ideas.length} ideas
                  </div>
                  {ideas.map((idea, i) => <IdeaCard key={i} idea={idea} index={i} />)}
                </div>
              )}

              {!loading && ideas.length === 0 && (
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

function IdeaCard({ idea, index }: { idea: Idea; index: number }) {
  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied') }
  return (
    <motion.div
      initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{delay: index*0.04}}
      className="group rounded-xl p-3 bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.06] hover:border-gold-500/40 transition"
    >
      <div className="flex items-start gap-2">
        <span className="font-display text-[10px] text-gold-400/80 tracking-widest mt-0.5">{String(index+1).padStart(2,'0')}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{idea.title}</div>
          {idea.hook && (
            <div className="text-[12px] italic text-luxe/80 mt-1.5 leading-snug">“{idea.hook}”</div>
          )}
          {idea.angle && (
            <div className="text-[10px] tracking-wide text-gold-300/80 mt-1.5 leading-snug">
              <span className="text-gold-400/60">▸ </span>{idea.angle}
            </div>
          )}
        </div>
        <button
          onClick={() => copy(`${idea.title}\n\nHook: ${idea.hook}\nAngle: ${idea.angle}`)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-gold-300 transition"
          aria-label="Copy idea"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  )
}
