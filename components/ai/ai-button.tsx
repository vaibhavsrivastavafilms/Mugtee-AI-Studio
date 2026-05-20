'use client'
import { useState, useCallback } from 'react'
import { Sparkles, Loader2, Copy, Save, Wand2, AlertTriangle, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'
import { readCreatorProfile } from '@/components/ai/viral-studio-panel'
import { cn } from '@/lib/utils'
import type { ContentPiece } from '@/lib/types'

type Mode = 'reel_script' | 'viral_hook' | 'caption' | 'shot_breakdown' | 'analyze'

const MODES: { id: Mode; label: string; short: string; icon: any }[] = [
  { id: 'reel_script',     label: 'Reel Script',      short: 'Script',   icon: Wand2 },
  { id: 'viral_hook',      label: 'Viral Hook',       short: 'Hooks',    icon: Flame },
  { id: 'caption',         label: 'Caption + Tags',   short: 'Caption',  icon: Sparkles },
  { id: 'shot_breakdown',  label: 'Shot Breakdown',   short: 'Shots',    icon: Wand2 },
  { id: 'analyze',         label: 'Analyze Virality', short: 'Analyze',  icon: AlertTriangle },
]

interface Props {
  content: ContentPiece
  variant?: 'icon' | 'pill' | 'full'
  className?: string
}

export function AiButton({ content, variant = 'icon', className }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-md transition',
          variant === 'icon' && 'p-1.5 bg-black/40 backdrop-blur hover:bg-gold-500/30 ring-1 ring-gold-500/30',
          variant === 'pill' && 'px-2.5 py-1 text-[10px] tracking-widest uppercase bg-gold-500/15 hover:bg-gold-500/25 text-gold-200 ring-1 ring-gold-500/30',
          variant === 'full' && 'px-3 py-2 text-xs bg-gold-gradient text-black hover:opacity-90 shadow-gold-glow',
          className,
        )}
        title="Generate with Viral Script Engine"
      >
        <Sparkles className={cn('shrink-0', variant === 'full' ? 'w-4 h-4' : 'w-3 h-3')} />
        {variant !== 'icon' && <span>{variant === 'full' ? 'Generate with VSE' : 'VSE'}</span>}
      </button>
      {open && <AiDialog content={content} onClose={() => setOpen(false)} />}
    </>
  )
}

function AiDialog({ content, onClose }: { content: ContentPiece; onClose: () => void }) {
  const { updateContent } = useStore()
  const [mode, setMode] = useState<Mode>('reel_script')
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<string>('')
  const [analyze, setAnalyze] = useState<any>(null)

  const generate = useCallback(async () => {
    setLoading(true); setOutput(''); setAnalyze(null)
    const profile = readCreatorProfile()
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          context: {
            title: content.title,
            description: content.description,
            platform: content.platform,
            status: content.status,
            scheduled_at: content.scheduled_at,
            tags: content.tags,
            niche: profile.niche,
            audience: profile.audience,
            existing_script: (content as any).script || content.description,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error || 'Generation failed'); return }
      if (mode === 'analyze') {
        setAnalyze(data.output)
        setOutput(data.raw || JSON.stringify(data.output, null, 2))
      } else {
        setOutput(typeof data.output === 'string' ? data.output : JSON.stringify(data.output, null, 2))
      }
    } catch (e: any) {
      toast.error(e?.message || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }, [mode, content])

  const saveToContent = useCallback(async () => {
    if (!output) return
    if (mode === 'reel_script') {
      await updateContent(content.id, { script: output } as any)
      toast.success('Saved to script')
    } else if (mode === 'analyze') {
      const note = `\n\n— VSE Analysis —\n${output}`
      await updateContent(content.id, { description: (content.description || '') + note } as any)
      toast.success('Analysis appended to description')
    } else {
      const note = `\n\n— VSE ${MODES.find(m => m.id === mode)?.label} —\n${output}`
      await updateContent(content.id, { description: (content.description || '') + note } as any)
      toast.success('Saved to description')
    }
    onClose()
  }, [output, mode, content, updateContent, onClose])

  const copyOut = () => {
    if (!output) return
    navigator.clipboard.writeText(output)
    toast.success('Copied')
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
            <Sparkles className="w-3 h-3" /> Viral Script Engine
          </div>
          <DialogTitle className="font-display text-2xl">
            <span className="text-gold-gradient">Generate</span> for “{content.title}”
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">{content.platform} · {content.status}{content.scheduled_at ? ' · scheduled' : ''}</p>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setOutput(''); setAnalyze(null) }}>
          <TabsList className="grid grid-cols-5 bg-white/[0.03] gap-1 h-auto">
            {MODES.map(m => (
              <TabsTrigger key={m.id} value={m.id} className="text-[10px] sm:text-xs py-1.5 data-[state=active]:bg-gold-gradient data-[state=active]:text-black">
                <m.icon className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">{m.label}</span>
                <span className="sm:hidden">{m.short}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex-1 overflow-y-auto scrollbar-luxe pr-1 mt-2">
          {loading ? (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="relative">
                <Sparkles className="w-10 h-10 text-gold-400 animate-pulse" />
                <Loader2 className="w-5 h-5 absolute -bottom-1 -right-1 text-gold-300 animate-spin" />
              </div>
              <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">Generating cinematic output…</div>
            </motion.div>
          ) : analyze && mode === 'analyze' ? (
            <AnalyzeView data={analyze} />
          ) : output ? (
            <Textarea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              rows={mode === 'reel_script' ? 26 : 14}
              className={
                mode === 'reel_script'
                  ? 'bg-white/[0.03] text-[13px] leading-[1.75] min-h-[480px] sm:min-h-[560px] whitespace-pre-wrap'
                  : 'bg-white/[0.03] font-mono text-[12px] leading-relaxed min-h-[280px]'
              }
            />
          ) : (
            <div className="text-center py-14 text-luxe/60 text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-gold-400/40" />
              Pick a mode and hit <span className="text-gold-300">Generate</span>. Context auto-injected from this content piece.
            </div>
          )}
        </div>

        <DialogFooter className="!justify-between flex-wrap gap-2 pt-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-2">
            {output && (
              <>
                <Button size="sm" variant="ghost" onClick={copyOut} className="text-muted-foreground hover:text-gold-300">
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="ghost" onClick={saveToContent} className="text-gold-300 hover:text-gold-200 hover:bg-gold-500/10">
                  <Save className="w-3.5 h-3.5 mr-1" /> Save to content
                </Button>
              </>
            )}
          </div>
          <Button onClick={generate} disabled={loading} className="bg-gold-gradient text-black">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            {output ? 'Regenerate' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AnalyzeView({ data }: { data: any }) {
  const score = Number(data?.score) || 0
  const tier = score >= 80 ? 'elite' : score >= 60 ? 'strong' : score >= 40 ? 'ok' : 'weak'
  const tierColor = tier === 'elite' ? 'text-emerald-300 bg-emerald-500/15' : tier === 'strong' ? 'text-gold-300 bg-gold-500/15' : tier === 'ok' ? 'text-sky-300 bg-sky-500/15' : 'text-red-300 bg-red-500/15'
  const arr = (v: any): string[] => Array.isArray(v) ? v.filter(x => typeof x === 'string') : []
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" fill="none" />
            <circle cx="40" cy="40" r="34" stroke="url(#g)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={`${(score/100)*213.6} 213.6`} />
            <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde68a"/><stop offset="1" stopColor="#d97706"/></linearGradient></defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-xl text-gold-gradient leading-none">{score}</div>
            <div className="text-[9px] tracking-widest uppercase text-muted-foreground">score</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn('text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full', tierColor)}>{data?.hook_strength || tier}</span>
            {data?.hook_pattern && <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/[0.05] text-luxe/80">{String(data.hook_pattern).replace(/_/g, ' ')}</span>}
          </div>
          {data?.verdict && <p className="text-sm text-luxe/90 italic leading-snug">“{data.verdict}”</p>}
          {data?.audience_psychology && (
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
              <span className="text-gold-400/80 tracking-wider uppercase">Audience · </span>{data.audience_psychology}
            </p>
          )}
        </div>
      </div>

      {arr(data?.emotional_structure).length > 0 && (
        <Section title="Emotional Structure" items={arr(data.emotional_structure)} accent="text-violet-300" />
      )}
      {arr(data?.emotional_triggers).length > 0 && (
        <Section title="Emotional Triggers" items={arr(data.emotional_triggers)} accent="text-rose-300" />
      )}
      {arr(data?.retention).length > 0 && (
        <Section title="Retention Mechanics" items={arr(data.retention)} accent="text-sky-300" />
      )}
      {arr(data?.pacing).length > 0 && (
        <Section title="Pacing" items={arr(data.pacing)} accent="text-gold-300" />
      )}
      {arr(data?.fixes).length > 0 && (
        <Section title="Surgical Fixes" items={arr(data.fixes)} accent="text-emerald-300" />
      )}
    </div>
  )
}

function Section({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <div>
      <div className={cn('text-[10px] tracking-[0.3em] uppercase mb-2', accent)}>{title}</div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm text-luxe/85"><span className={cn('mt-1.5 w-1 h-1 rounded-full shrink-0', accent.replace('text-', 'bg-'))} />{s}</li>
        ))}
      </ul>
    </div>
  )
}
