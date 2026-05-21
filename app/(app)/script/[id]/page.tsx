'use client'
// Phase 13F — Dedicated script workspace.
// Reads from the existing content_pieces store (no new table).
// Bugfix P11.1: cold-tab race — if the store hasn't hydrated the just-saved row yet,
// fall back to a direct Supabase lookup by id before showing "no longer exists".

import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowLeft, Copy, Check, Plus, Pencil, CalendarCheck, Wand2, Download, Loader2, Brain, Film, Volume2, Pause, Play, Square, History, Undo2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { PLATFORM_META, STATUS_META } from '@/lib/dummy-data'
import { toast } from 'sonner'
import type { ContentPiece } from '@/lib/types'
import { useSpeechSynthesis } from '@/lib/use-voice'
import { useUsage } from '@/lib/usage'
import { RewriteToolbar, type RewriteVariant } from '@/components/script/rewrite-toolbar'
import { exportScriptAsDoc } from '@/lib/export-docx'

export default function ScriptWorkspace() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const { content, updateContent, loading } = useStore()
  const { isUnlimited } = useUsage()
  const storePiece = useMemo(() => content.find(c => c.id === params.id), [content, params.id])

  // Direct-lookup fallback row (only populated if the store doesn't contain the id)
  const [directPiece, setDirectPiece] = useState<ContentPiece | null>(null)
  const [directState, setDirectState] = useState<'idle' | 'fetching' | 'done'>('idle')

  // The effective piece used to render. Prefer the store row (always fresh via realtime).
  const piece: ContentPiece | null = (storePiece as any) || directPiece

  // Phase P11.1 — When the store finishes loading and still doesn't have the id,
  // do an explicit Supabase fetch for that id. This survives read-after-write race
  // and realtime sync lag in a freshly-opened tab.
  //
  // Hardening (this pass): aborts on unmount, hard-times out after 4 s per attempt,
  // logs both data and error for debugability, and ALWAYS terminates `directState`
  // even on uncaught exceptions so the page can never deadlock.
  useEffect(() => {
    if (loading.initial) return            // wait for the bulk fetch to finish
    if (storePiece) return                  // store already has it — nothing to do
    if (directState !== 'idle') return     // already attempted
    if (!params?.id) { setDirectState('done'); return }  // defensive — bad URL

    setDirectState('fetching')
    let cancelled = false
    const supabase = createSupabaseBrowserClient()

    const tryFetch = async (attempt: number): Promise<void> => {
      // 4s per-attempt timeout via AbortController — the Supabase JS client respects
      // AbortSignal so a hung network call cannot block the page forever.
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      try {
        const { data, error } = await supabase
          .from('content_pieces')
          .select('*')
          .eq('id', params.id)
          .is('deleted_at', null)
          .abortSignal(controller.signal)
          .maybeSingle()
        clearTimeout(timer)
        console.log('[Workspace Fetch]', { attempt, id: params.id, hasData: !!data })
        if (cancelled) return
        if (data) { setDirectPiece(data as any); setDirectState('done'); return }
        if (error) { console.warn('[Workspace Error]', error) }
        // brief retry once in case the INSERT is still propagating across replicas
        if (attempt < 1) {
          await new Promise(r => setTimeout(r, 700))
          if (!cancelled) return tryFetch(attempt + 1)
        }
        if (!cancelled) setDirectState('done')
      } catch (e: any) {
        clearTimeout(timer)
        console.warn('[Workspace Error]', e?.message || e)
        if (!cancelled) setDirectState('done')   // never leave it 'fetching'
      }
    }
    tryFetch(0).catch(e => {
      console.warn('[Workspace Error] outer', e?.message || e)
      if (!cancelled) setDirectState('done')
    })

    return () => { cancelled = true }
  }, [loading.initial, storePiece, params?.id, directState])

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [flowLoading, setFlowLoading] = useState(false)
  const [flowOut, setFlowOut] = useState<any | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Phase V1.2 — Highlight + Rewrite local state.
  // `liveScript` is the source-of-truth for the rendered <pre> body. It mirrors the DB
  // value initially, but absorbs rewrite-toolbar replacements before they are persisted.
  // `versions` is a lightweight inline history (max 5 snapshots) — survives the session
  // but is not persisted to localStorage by default to avoid stale state across tabs.
  const [liveScript, setLiveScript] = useState<string>('')
  const [versions, setVersions] = useState<{ at: number; label: string; text: string }[]>([])
  const scriptBodyRef = useRef<HTMLPreElement>(null)

  // Sync liveScript whenever the underlying piece changes (initial load or realtime update).
  useEffect(() => {
    const src = (piece as any)?.script || piece?.description || ''
    setLiveScript(src)
  }, [piece?.id, (piece as any)?.script, piece?.description])

  const pushVersion = (label: string, text: string) => {
    setVersions(prev => [{ at: Date.now(), label, text }, ...prev].slice(0, 5))
  }

  const handleRewriteReplace = async (original: string, replacement: string, variant: RewriteVariant) => {
    if (!piece) return
    // Snapshot the current full script BEFORE replacing (so Undo works).
    pushVersion(`Before ${variant.replace('_', ' ')}`, liveScript)
    // Replace ONLY the first occurrence of the original selection in the live script.
    const idx = liveScript.indexOf(original)
    const next = idx >= 0
      ? liveScript.slice(0, idx) + replacement + liveScript.slice(idx + original.length)
      : liveScript + '\n\n' + replacement  // defensive — selection drifted; append instead of corrupting
    setLiveScript(next)
    // Persist to DB (fire-and-forget; UI already updated optimistically).
    try { await updateContent(piece.id, { script: next } as any) } catch (e:any) { toast.error(e?.message || 'Save failed') }
    setDirectPiece(p => p ? ({ ...p, script: next } as any) : p)
  }

  const restoreVersion = async (v: { at: number; label: string; text: string }) => {
    if (!piece) return
    pushVersion('Before restore', liveScript)
    setLiveScript(v.text)
    try { await updateContent(piece.id, { script: v.text } as any) } catch {}
    setDirectPiece(p => p ? ({ ...p, script: v.text } as any) : p)
    toast.success('Version restored')
  }

  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  const beginEdit = () => { setDraft(liveScript || (piece as any)?.script || piece?.description || ''); setEditing(true) }
  const saveEdit = async () => {
    if (!piece) return
    pushVersion('Before manual edit', liveScript)
    await updateContent(piece.id, { script: draft } as any)
    setLiveScript(draft)
    setDirectPiece(p => p ? ({ ...p, script: draft } as any) : p)
    setEditing(false)
    toast.success('Script saved')
  }

  const exportTxt = () => {
    if (!piece) return
    const body = liveScript || (piece as any).script || piece.description || ''
    // Phase V1.2 — Trust Fix #7: "Made with Mugtee" watermark on free-tier exports only.
    const footer = isUnlimited ? '' : '\n\n---\nMade with Mugtee · AI Production OS for creators · https://mugtee.in\n'
    const text = `# ${piece.title}\n\n${body}${footer}`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${piece.title.replace(/[^a-z0-9-_]+/gi,'-').toLowerCase()}.txt`; a.click(); URL.revokeObjectURL(url)
  }

  // Phase V1.5 — DOCX export (Word/Pages-compatible via HTML→.doc trick, no library).
  const exportDocx = () => {
    if (!piece) return
    const body = liveScript || (piece as any).script || piece.description || ''
    exportScriptAsDoc({ title: piece.title, body, isUnlimited })
    toast.success('📄 Exported as Word doc')
  }

  const genFlow = async () => {
    if (!piece) return
    setFlowLoading(true); setFlowOut(null)
    try {
      const src = (piece as any).script || piece.description || piece.title
      const res = await fetch('/api/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'flow_prompts', context: { script_input: src, platform: piece.platform, language: 'english' } }) })
      const d = await res.json()
      if (!res.ok || d.error) { toast.error(d.error || 'Flow generation failed'); return }
      setFlowOut(d.output)
      // Phase V1.2 — Auto-save the prompt set to Library (Prompts tab). Localstorage-only; max 50 rows.
      try {
        const scenePrompts = (d.output?.scene_prompts || []).map((p: any) => ({ type: String(p.type || 'scene'), prompt: String(p.prompt || '') })).filter((p: any) => p.prompt)
        if (scenePrompts.length) {
          const existing: any[] = JSON.parse(localStorage.getItem('mugtee:library:prompts') || '[]')
          const next = [{ id: `prompt_${Date.now()}`, script_title: piece.title, prompts: scenePrompts, created_at: new Date().toISOString() }, ...existing].slice(0, 50)
          localStorage.setItem('mugtee:library:prompts', JSON.stringify(next))
          toast.success('✅ Saved to Library')
        }
      } catch {}
    } catch (e:any) { toast.error(e?.message || 'Network error') }
    finally { setFlowLoading(false) }
  }

  // Bugfix: hard escape from "Loading workspace…" — if the store + direct fetch
  // both fail to resolve within 4s (auth race, RLS lockout, supabase init issue,
  // hung network call), force the loading state to end so the user always lands
  // on a usable page (either a piece, or the graceful "not found" state) instead
  // of an infinite spinner. Tightened from 6s → 4s for snappier UX.
  const [hardTimeout, setHardTimeout] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setHardTimeout(true), 4000)
    return () => clearTimeout(t)
  }, [])

  // ---- Loading / not-found states ----
  // Show loading while either the bulk store fetch OR the direct id-fetch is in flight,
  // but never longer than the hard timeout above.
  if (!hardTimeout && (loading.initial || (!piece && directState !== 'done'))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-gold-300" />
        <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground">Loading workspace…</div>
      </div>
    )
  }

  if (!piece) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">Not found</div>
        <h1 className="font-display text-3xl mb-3">This script no longer exists</h1>
        <p className="text-luxe/70 text-sm mb-6">It may have been deleted or moved to trash.</p>
        <Button onClick={() => router.push('/pipeline')} className="bg-gold-gradient text-black gap-2"><ArrowLeft className="w-4 h-4" /> Back to Projects</Button>
      </div>
    )
  }

  const platformMeta = PLATFORM_META[piece.platform]
  const statusMeta   = STATUS_META[piece.status]
  const scriptText = liveScript || (piece as any).script || piece.description || ''
  const tags = piece.tags || []

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-5xl mx-auto space-y-4 sm:space-y-5 pb-24 sm:pb-12 px-1 sm:px-0 relative">
      {/* Phase V1.2 — Floating Highlight + Rewrite toolbar. Listens for selections inside `scriptBodyRef`. */}
      {!editing && (
        <RewriteToolbar
          containerRef={scriptBodyRef as any}
          context={{
            title: piece.title,
            platform: piece.platform,
            niche: (piece as any).niche || undefined,
            tone:  (piece as any).tone  || undefined,
            full_script: liveScript,
          }}
          onReplace={handleRewriteReplace}
        />
      )}      {/* Top bar — sticky on mobile so actions stay reachable while reading long scripts */}
      <div className="sticky top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 sm:py-0 sm:static bg-background/85 backdrop-blur sm:bg-transparent sm:backdrop-blur-0 sm:rounded-none flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-gold-300 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {/* Read Script — browser SpeechSynthesis. Stops any existing speech before starting new. */}
          <ReadScriptButton text={scriptText} />
          <Button onClick={() => copy('script', scriptText)} variant="ghost" className="h-9 px-3 text-xs text-luxe/80 hover:text-gold-300 hover:bg-white/5 gap-1.5 min-h-[44px] sm:min-h-0">
            {copied === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} Copy
          </Button>
          <Button onClick={beginEdit} variant="ghost" className="h-9 px-3 text-xs text-luxe/80 hover:text-gold-300 hover:bg-white/5 gap-1.5 min-h-[44px] sm:min-h-0"><Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Continue editing</span><span className="sm:hidden">Edit</span></Button>
          <Button onClick={exportTxt} variant="ghost" className="h-9 px-3 text-xs text-luxe/80 hover:text-gold-300 hover:bg-white/5 gap-1.5 min-h-[44px] sm:min-h-0"><Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export .txt</span><span className="sm:hidden">TXT</span></Button>
          <Button onClick={exportDocx} variant="ghost" className="h-9 px-3 text-xs text-luxe/80 hover:text-gold-300 hover:bg-white/5 gap-1.5 min-h-[44px] sm:min-h-0" title="Export as Word document (.doc)"><Film className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export .doc</span><span className="sm:hidden">DOC</span></Button>
          <Button onClick={() => router.push('/pipeline')} className="h-9 px-3 text-xs bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 gap-1.5 min-h-[44px] sm:min-h-0"><Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Open in Pipeline</span><span className="sm:hidden">Pipeline</span></Button>
        </div>
      </div>

      {/* Hero */}
      <div className="glass-strong rounded-3xl p-6 sm:p-8 border border-gold-soft">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Script workspace</span>
          {tags.includes('faceless') && <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-gold-500/10 border border-gold-500/30 text-gold-300 inline-flex items-center gap-1"><Brain className="w-2.5 h-2.5" /> Faceless</span>}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl leading-tight mb-2">{piece.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider ${platformMeta.color} bg-white/[0.03] border border-white/[0.06]`}>{platformMeta.label}</span>
          <span className="px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/[0.03] border border-white/[0.06]">{statusMeta.label}</span>
          {piece.scheduled_at && <span className="inline-flex items-center gap-1"><CalendarCheck className="w-3 h-3 text-gold-400/80" /> {format(parseISO(piece.scheduled_at), 'MMM d · HH:mm')}</span>}
          {piece.created_at && <span className="opacity-60">created {format(parseISO(piece.created_at), 'MMM d, yyyy')}</span>}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map(t => <span key={t} className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-muted-foreground">{t}</span>)}
          </div>
        )}
      </div>

      {/* Script body */}
      <div className="rounded-2xl glass border border-gold-soft p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300">Full script</span>
          {!editing && <span className="text-[10px] text-muted-foreground">{scriptText.split(/\s+/).filter(Boolean).length} words</span>}
        </div>
        {editing ? (
          <>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} className="w-full min-h-[280px] bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-[13px] leading-relaxed font-mono text-luxe/90 focus:outline-none focus:border-gold-500/50" />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={() => setEditing(false)} className="text-muted-foreground">Cancel</Button>
              <Button onClick={saveEdit} className="bg-gold-gradient text-black gap-2"><Check className="w-4 h-4" /> Save</Button>
            </div>
          </>
        ) : scriptText ? (
          <pre ref={scriptBodyRef} className="text-[13px] sm:text-[13px] leading-[1.75] sm:leading-relaxed text-luxe/90 whitespace-pre-wrap font-mono break-words select-text">{scriptText}</pre>
        ) : (
          <div className="text-[12px] text-muted-foreground italic">No script body yet. Click <span className="text-gold-300">Continue editing</span> to start writing.</div>
        )}
        {/* Phase V1.2 — Hint shown only when there is body text */}
        {scriptText && !editing && (
          <div className="mt-3 pt-3 border-t border-white/[0.05] text-[10px] text-muted-foreground tracking-wider flex items-center gap-1.5">
            <Wand2 className="w-3 h-3 text-gold-400/80" /> Highlight any paragraph to rewrite it with AI · 5 styles
          </div>
        )}
      </div>

      {/* Phase V1.2 — Inline version history (last 5 snapshots, this session) */}
      {versions.length > 0 && (
        <div className="rounded-2xl glass border border-gold-soft p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center gap-1.5"><History className="w-3 h-3" /> Version history · this session</span>
            <span className="text-[10px] text-muted-foreground">{versions.length}/5</span>
          </div>
          <div className="space-y-1.5">
            {versions.map((v, i) => (
              <div key={v.at} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-luxe/85 truncate">{v.label}</div>
                  <div className="text-[9px] text-muted-foreground tracking-wider">{format(new Date(v.at), 'HH:mm:ss')} · {v.text.split(/\s+/).filter(Boolean).length} words</div>
                </div>
                <Button onClick={() => restoreVersion(v)} variant="ghost" className="h-7 px-2 text-[10px] tracking-wider uppercase text-gold-300 hover:text-gold-100 hover:bg-gold-500/10 gap-1">
                  <Undo2 className="w-3 h-3" /> Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flow prompts panel */}
      <div className="rounded-2xl glass border border-gold-soft p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center gap-1.5"><Wand2 className="w-3 h-3" /> Flow / B-roll prompts</span>
          <Button onClick={genFlow} disabled={flowLoading} className="h-7 px-3 text-[11px] bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 gap-1.5">
            {flowLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} {flowLoading ? 'Generating…' : flowOut ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
        {flowOut ? (
          <div className="space-y-2">
            {flowOut.style_summary && <div className="text-[11px] italic text-luxe/70 mb-2">Style · {flowOut.style_summary}</div>}
            {(flowOut.scene_prompts || []).map((p:any, i:number) => (
              <div key={i} className="group flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[9px] tracking-widest uppercase text-gold-400/80 mt-0.5 shrink-0 w-16">{p.type}</span>
                <span className="text-[12px] text-luxe/85 flex-1 leading-snug">{p.prompt}</span>
                <button onClick={() => copy('p'+i, p.prompt)} className="opacity-0 group-hover:opacity-100 text-[10px] uppercase text-muted-foreground hover:text-gold-300 inline-flex items-center gap-1 transition-opacity">
                  {copied === 'p'+i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-muted-foreground italic">Click Generate to produce 8-12 cinematic image/B-roll prompts derived from this script.</div>
        )}
      </div>

      {/* Media attached */}
      {piece.media_url && (
        <div className="rounded-2xl glass border border-gold-soft p-5">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 mb-2 inline-flex items-center gap-1.5"><Film className="w-3 h-3" /> Media attached</span>
          <div className="text-[11px] text-luxe/70 font-mono break-all mt-1">{piece.media_url}</div>
        </div>
      )}
    </motion.div>
  )
}

// ---------- Read Script (TTS) sub-component ----------
// Browser SpeechSynthesis with pause/resume/stop. Cancels any previous speech before starting new.
// Hidden gracefully if the browser doesn't support speechSynthesis.
function ReadScriptButton({ text }: { text: string }) {
  const tts = useSpeechSynthesis()
  if (!tts.supported || !text || text.length < 10) return null
  if (tts.speaking) {
    return (
      <div className="inline-flex items-center gap-0.5 mr-0.5">
        {tts.paused ? (
          <Button onClick={tts.resume} variant="ghost" className="h-9 px-3 text-xs text-gold-300 hover:text-gold-200 hover:bg-gold-500/10 gap-1.5 min-h-[44px] sm:min-h-0">
            <Play className="w-3.5 h-3.5" /> Resume
          </Button>
        ) : (
          <Button onClick={tts.pause} variant="ghost" className="h-9 px-3 text-xs text-gold-300 hover:text-gold-200 hover:bg-gold-500/10 gap-1.5 min-h-[44px] sm:min-h-0">
            <Pause className="w-3.5 h-3.5" /> Pause
          </Button>
        )}
        <Button onClick={tts.stop} variant="ghost" className="h-9 px-3 text-xs text-muted-foreground hover:text-luxe hover:bg-white/5 gap-1.5 min-h-[44px] sm:min-h-0">
          <Square className="w-3.5 h-3.5" /> Stop
        </Button>
      </div>
    )
  }
  return (
    <Button
      onClick={() => tts.speak(text)}
      variant="ghost"
      className="h-9 px-3 text-xs text-gold-200 hover:text-gold-100 bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 gap-1.5 min-h-[44px] sm:min-h-0"
      title="Read this script aloud — narrated by Mugtee"
    >
      <Volume2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Read Script</span><span className="sm:hidden">Read</span>
    </Button>
  )
}
