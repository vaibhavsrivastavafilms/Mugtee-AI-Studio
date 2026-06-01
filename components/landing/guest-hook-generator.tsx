'use client'
// Guest "Try Mugtee" — one cinematic opening hook without signing up.
// Rate-limited via localStorage (3 free guest hooks per 24h).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, Loader2, Copy, Check, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const RATE_KEY = 'mugtee:guest:hook:v1'
const MAX_PER_DAY = 3

type RateRow = { day: string; count: number }
function todayKey() { return new Date().toISOString().slice(0, 10) }
function readRate(): RateRow {
  if (typeof window === 'undefined') return { day: todayKey(), count: 0 }
  try {
    const raw = localStorage.getItem(RATE_KEY)
    if (!raw) return { day: todayKey(), count: 0 }
    const parsed = JSON.parse(raw) as RateRow
    return parsed.day === todayKey() ? parsed : { day: todayKey(), count: 0 }
  } catch { return { day: todayKey(), count: 0 } }
}
function writeRate(r: RateRow) { try { localStorage.setItem(RATE_KEY, JSON.stringify(r)) } catch {} }

export function GuestHookGenerator() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [hooks, setHooks] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number>(MAX_PER_DAY)

  useEffect(() => {
    const r = readRate()
    setRemaining(Math.max(0, MAX_PER_DAY - r.count))
  }, [])

  const generate = async () => {
    setError(null)
    const t = topic.trim()
    if (!t) { setError('Type a topic first — e.g. "faceless YouTube channel about ancient history"'); return }
    const r = readRate()
    if (r.count >= MAX_PER_DAY) { setError('Daily guest limit reached. Sign up free for unlimited.'); return }
    setLoading(true); setHooks([])
    try {
      const res = await fetch('/api/guest-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) { setError(data?.error || 'Something went wrong'); return }
      const lines = Array.isArray(data.hooks) ? data.hooks : []
      setHooks(lines.slice(0, 3))
      const next = { day: todayKey(), count: r.count + 1 }
      writeRate(next)
      setRemaining(Math.max(0, MAX_PER_DAY - next.count))
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const copy = async (text: string, i: number) => {
    try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  return (
    <div className="relative rounded-3xl p-6 sm:p-9 glass-strong border border-gold-soft">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <div className="text-[10px] tracking-[0.35em] uppercase text-gold-300 mb-1.5">Try Mugtee · no signup</div>
          <h3 className="font-display text-2xl sm:text-3xl leading-tight">Open with a <span className="text-gold-gradient">cinematic hook</span>.</h3>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] tracking-wider uppercase text-muted-foreground border border-white/[0.06] bg-white/[0.03] rounded-full px-2.5 py-1">
          <Zap className="w-3 h-3 text-gold-300" /> {remaining}/{MAX_PER_DAY} left today
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !loading) generate() }}
          placeholder="e.g. how AI is changing documentary filmmaking"
          className="flex-1 px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] focus:border-gold-500/50 focus:outline-none text-sm text-luxe placeholder:text-muted-foreground/60"
        />
        <button
          onClick={generate}
          disabled={loading || !topic.trim() || remaining <= 0}
          className={cn(
            'inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition shrink-0 min-h-[48px]',
            (loading || !topic.trim() || remaining <= 0)
              ? 'bg-white/[0.04] border border-white/[0.06] text-muted-foreground cursor-not-allowed'
              : 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90',
          )}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate hook</>}
        </button>
      </div>
      {error && <div className="mt-3 text-[12px] text-rose-300/90 bg-rose-500/[0.08] border border-rose-500/30 rounded-md px-3 py-2">{error}</div>}

      {hooks.length > 0 && (
        <div className="mt-5 space-y-2">
          {hooks.map((h, i) => (
            <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.03] border border-gold-500/20 hover:border-gold-500/40 transition group">
              <span className="text-[14px] sm:text-[15px] text-luxe/95 leading-relaxed flex-1">&quot;{h}&quot;</span>
              <button onClick={() => copy(h, i)} className="opacity-70 hover:opacity-100 transition shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-gold-300 hover:bg-gold-500/10">
                {copied === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
          <Link href="/login" className="inline-flex items-center gap-1.5 text-[12px] tracking-wider uppercase text-gold-300 hover:text-gold-200 mt-2 transition">
            Want full scripts + reels? Start free <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
      {!hooks.length && !error && (
        <div className="mt-3 text-[11px] text-muted-foreground/80">3 free hooks per day · No login · Emotionally directed openings, not viral bait.</div>
      )}
    </div>
  )
}
