'use client'
// Phase 12 — Weekly AI Content Planner
// Reuses /api/ai/generate (mode: weekly_plan / regen_day), creator profile (niche/audience from localStorage),
// and the existing store's addContent() for bulk pipeline insertion. No new deps, no new schema.

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, RefreshCw, CheckCircle2, Circle, CalendarCheck, Plus, Loader2, Film, Image as ImageIcon, LayoutList, MonitorPlay, Zap, BookOpen, Heart, Smile, Users, Award, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NICHES, AUDIENCES, TONES } from '@/components/ai/viral-studio-panel'
import { PLATFORM_META } from '@/lib/dummy-data'
import { useStore } from '@/lib/store'
import { useUsage, UpgradeModal } from '@/lib/usage'
import type { Platform, ContentPiece } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

const GOALS: { id: string; label: string }[] = [
  { id: 'growth',            label: 'Growth' },
  { id: 'engagement',        label: 'Engagement' },
  { id: 'storytelling',      label: 'Storytelling' },
  { id: 'product_awareness', label: 'Product Awareness' },
  { id: 'personal_branding', label: 'Personal Branding' },
  { id: 'authority',         label: 'Build Authority' },
]
const FREQUENCIES: { id: string; label: string }[] = [
  { id: 'daily',    label: 'Daily (7/wk)' },
  { id: '5x_week',  label: '5x / week' },
  { id: '3x_week',  label: '3x / week' },
]
const LANGUAGES: { id: string; label: string }[] = [
  { id: 'auto',     label: 'Auto' },
  { id: 'english',  label: 'English' },
  { id: 'hinglish', label: 'Hinglish' },
  { id: 'gujarati', label: 'Gujarati' },
  { id: 'guj_hindi',label: 'Gujarati + Hindi' },
]
const PILLAR_META: Record<string, { color: string; icon: any }> = {
  educational:   { color: 'text-blue-300 bg-blue-500/10 border-blue-500/30',     icon: BookOpen },
  emotional:     { color: 'text-pink-300 bg-pink-500/10 border-pink-500/30',     icon: Heart },
  entertaining:  { color: 'text-amber-300 bg-amber-500/10 border-amber-500/30',  icon: Smile },
  relatable:     { color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', icon: Users },
  authority:     { color: 'text-purple-300 bg-purple-500/10 border-purple-500/30',    icon: Award },
  trend:         { color: 'text-rose-300 bg-rose-500/10 border-rose-500/30',     icon: TrendingUp },
}
const TYPE_ICON: Record<string, any> = { reel: Film, post: ImageIcon, carousel: LayoutList, short: MonitorPlay }

export interface PlanDay {
  day_index: number
  day_label: string
  posting_date: string
  title: string
  hook: string
  content_type: 'reel' | 'post' | 'carousel' | 'short' | string
  description: string
  cta: string
  emotional_angle: string
  content_pillar: 'educational' | 'emotional' | 'entertaining' | 'relatable' | 'authority' | 'trend' | string
}

function readCreatorProfile(): { niche: string; audience: string } {
  if (typeof window === 'undefined') return { niche: 'restaurant', audience: 'mass' }
  try {
    return {
      niche:    localStorage.getItem('tt:creator:niche')    || 'restaurant',
      audience: localStorage.getItem('tt:creator:audience') || 'mass',
    }
  } catch { return { niche: 'restaurant', audience: 'mass' } }
}

export function WeeklyPlannerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addContent } = useStore()
  const { guard, bump, upgradeOpen, setUpgradeOpen, upgradeReason } = useUsage()
  const seed = readCreatorProfile()
  const [niche, setNiche]       = useState(seed.niche)
  const [audience, setAudience] = useState(seed.audience)
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [tone, setTone]         = useState('storytelling')
  const [language, setLanguage] = useState('auto')
  const [goal, setGoal]         = useState('engagement')
  const [frequency, setFrequency] = useState('daily')
  const [days, setDays]         = useState(7)
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading]   = useState(false)
  const [regenIdx, setRegenIdx] = useState<number | null>(null)
  const [strategy, setStrategy] = useState<string>('')
  const [plan, setPlan]         = useState<PlanDay[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [inserting, setInserting] = useState(false)

  // Reset whenever the dialog opens (so creator profile updates are picked up)
  useEffect(() => {
    if (open) {
      const s = readCreatorProfile()
      setNiche(s.niche); setAudience(s.audience)
    }
  }, [open])

  const generate = async () => {
    if (!guard('planner')) return
    setLoading(true); setPlan([]); setStrategy(''); setSelected(new Set())
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'weekly_plan',
          context: { niche, audience, platform, tone, language, days, frequency, goal, start_date: startDate },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { toast.error(data.error || 'Could not generate plan'); return }
      const out = data.output || {}
      const arr: PlanDay[] = Array.isArray(out.days) ? out.days : []
      if (!arr.length) { toast.error('Plan came back empty — try again'); return }
      setStrategy(out.strategy_summary || '')
      setPlan(arr)
      setSelected(new Set(arr.map((_, i) => i))) // all selected by default
      bump('planner')
    } catch (e: any) {
      toast.error(e?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const regenDay = async (idx: number, field: 'all' | 'hook' | 'cta' = 'all') => {
    if (!plan[idx]) return
    setRegenIdx(idx)
    try {
      const day = plan[idx]
      const usedPillars = plan.filter((_, i) => i !== idx).map(p => p.content_pillar)
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'regen_day',
          context: {
            niche, audience, platform, tone, language,
            day_index: idx, day_label: day.day_label,
            start_date: day.posting_date,
            used_pillars: usedPillars,
            regen_field: field,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { toast.error(data.error || 'Regenerate failed'); return }
      const next = data.output || {}
      setPlan(p => p.map((d, i) => {
        if (i !== idx) return d
        if (field === 'hook') return { ...d, hook: next.hook || d.hook }
        if (field === 'cta')  return { ...d, cta:  next.cta  || d.cta }
        return { ...d, ...next, day_index: idx, posting_date: d.posting_date, day_label: d.day_label }
      }))
    } catch (e: any) {
      toast.error(e?.message || 'Regenerate error')
    } finally {
      setRegenIdx(null)
    }
  }

  const toggle = (i: number) => setSelected(s => {
    const n = new Set(s)
    if (n.has(i)) n.delete(i); else n.add(i)
    return n
  })

  const insertSelected = async () => {
    const chosen = plan.filter((_, i) => selected.has(i))
    if (!chosen.length) { toast.error('Select at least one day'); return }
    setInserting(true)
    try {
      for (const d of chosen) {
        // Reuse existing addContent — optimistic UI + Supabase + realtime are already wired
        const desc = `${d.hook}\n\n${d.description}\n\nCTA: ${d.cta}`
        const scheduledISO = (() => {
          try {
            const dt = parseISO(d.posting_date + 'T09:00:00')
            return isNaN(dt.getTime()) ? null : dt.toISOString()
          } catch { return null }
        })()
        await addContent({
          title: d.title,
          description: desc,
          platform,
          status: 'idea',
          scheduled_at: scheduledISO,
          tags: [d.content_pillar, d.content_type, d.emotional_angle].filter(Boolean),
        } as Partial<ContentPiece>)
      }
      toast.success(`Added ${chosen.length} idea${chosen.length>1?'s':''} to pipeline${chosen.some(d => d.posting_date)?' & calendar':''}`)
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || 'Could not insert plan')
    } finally {
      setInserting(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-400/80">
            <Sparkles className="w-3 h-3" /> ViralForge AI Engine
          </div>
          <DialogTitle className="font-display text-2xl sm:text-3xl">
            <span className="text-gold-gradient">Weekly</span> content planner
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">An AI strategist that plans a balanced, niche-native week in one click.</p>
        </DialogHeader>

        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <FieldSelect label="Niche" value={niche} onChange={setNiche} options={NICHES} />
          <FieldSelect label="Audience" value={audience} onChange={setAudience} options={AUDIENCES} />
          <FieldSelect label="Platform" value={platform} onChange={(v) => setPlatform(v as Platform)} options={Object.entries(PLATFORM_META).map(([k,v]) => ({ id: k, label: v.label }))} />
          <FieldSelect label="Tone" value={tone} onChange={setTone} options={TONES} />
          <FieldSelect label="Language" value={language} onChange={setLanguage} options={LANGUAGES} />
          <FieldSelect label="Goal" value={goal} onChange={setGoal} options={GOALS} />
          <FieldSelect label="Frequency" value={frequency} onChange={setFrequency} options={FREQUENCIES} />
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Days</label>
            <Input type="number" min={1} max={14} value={days} onChange={e => setDays(Math.max(1, Math.min(14, Number(e.target.value) || 7)))} className="bg-white/[0.03] h-9 text-xs" />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-2">
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Start date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white/[0.03] h-9 text-xs" />
          </div>
          <div className="col-span-2 sm:col-span-2 flex items-end">
            <Button onClick={generate} disabled={loading} className="w-full h-9 bg-gold-gradient text-black gap-2 shadow-gold-glow">
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Planning…</> : <><Sparkles className="w-3.5 h-3.5" /> Generate Weekly Plan</>}
            </Button>
          </div>
        </div>

        {/* Strategy summary */}
        {strategy && (
          <div className="mt-4 p-3 rounded-xl glass-gold border border-gold-500/30">
            <div className="text-[10px] tracking-[0.25em] uppercase text-gold-300 mb-1">Strategic thesis</div>
            <div className="text-sm text-luxe leading-snug">{strategy}</div>
          </div>
        )}

        {/* Plan grid */}
        {plan.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Plan · {plan.length} days · {selected.size} selected</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(new Set(plan.map((_, i) => i)))} className="text-[10px] tracking-wider uppercase text-gold-300 hover:text-gold-200">Select all</button>
                <span className="text-muted-foreground/40 text-[10px]">·</span>
                <button onClick={() => setSelected(new Set())} className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-foreground">Clear</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {plan.map((d, i) => {
                const pillarMeta = PILLAR_META[d.content_pillar] || { color: 'text-muted-foreground bg-white/[0.03] border-white/[0.05]', icon: Zap }
                const PillarIcon = pillarMeta.icon
                const TypeIcon = TYPE_ICON[d.content_type] || Film
                const isSel = selected.has(i)
                const isRegen = regenIdx === i
                return (
                  <div key={i} className={cn(
                    'group relative rounded-xl border bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3.5 transition-all',
                    isSel ? 'border-gold-500/40 shadow-cinema' : 'border-white/[0.06] opacity-70 hover:opacity-100'
                  )}>
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <button onClick={() => toggle(i)} className="flex items-center gap-2 min-w-0 hover:opacity-90 text-left">
                        {isSel ? <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <div className="min-w-0">
                          <div className="text-[10px] tracking-[0.2em] uppercase text-gold-400/80">{d.day_label} · Day {i + 1}</div>
                          <div className="text-[10px] text-muted-foreground tabular-nums">{d.posting_date}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => regenDay(i, 'all')}
                        disabled={isRegen}
                        title="Regenerate this day"
                        className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-gold-300 transition disabled:opacity-50"
                      >
                        {isRegen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Title */}
                    <div className="text-sm font-medium leading-snug mb-1.5">{d.title}</div>

                    {/* Hook */}
                    <div className="text-[12px] text-luxe/90 italic leading-snug mb-2">"{d.hook}"</div>

                    {/* Description */}
                    <div className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed mb-2.5">{d.description}</div>

                    {/* Meta pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] tracking-wider uppercase border', pillarMeta.color)}>
                        <PillarIcon className="w-2.5 h-2.5" />{d.content_pillar}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] tracking-wider uppercase text-gold-300 bg-gold-500/10 border border-gold-500/30">
                        <TypeIcon className="w-2.5 h-2.5" />{d.content_type}
                      </span>
                      <span className="text-[9px] tracking-wider uppercase text-muted-foreground bg-white/[0.03] border border-white/[0.05] rounded px-1.5 py-0.5">{d.emotional_angle}</span>
                    </div>

                    {/* CTA row */}
                    <div className="flex items-start gap-1.5 pt-2 border-t border-white/[0.05]">
                      <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-0.5">CTA</span>
                      <span className="text-[11px] text-luxe/80 flex-1">{d.cta}</span>
                    </div>

                    {/* Quick regen actions */}
                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => regenDay(i, 'hook')} disabled={isRegen} className="text-[9px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 transition disabled:opacity-50">↻ Hook</button>
                      <button onClick={() => regenDay(i, 'cta')}  disabled={isRegen} className="text-[9px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 transition disabled:opacity-50">↻ CTA</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Insert footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-white/[0.05]">
              <p className="text-[10px] text-muted-foreground">Selected days will be added to pipeline as <span className="text-gold-300">ideas</span> and to the calendar at 9:00 on each posting date.</p>
              <Button onClick={insertSelected} disabled={inserting || selected.size === 0} className="bg-gold-gradient text-black gap-2 shadow-gold-glow h-9">
                {inserting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><CalendarCheck className="w-3.5 h-3.5" /> Add {selected.size} to pipeline</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </>
  )
}

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/[0.03] h-9 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
