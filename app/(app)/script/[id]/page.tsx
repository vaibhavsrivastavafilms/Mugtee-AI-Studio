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
import { Sparkles, ArrowLeft, Copy, Check, Plus, Pencil, CalendarCheck, Wand2, Download, Loader2, Brain, Film, Volume2, Pause, Play, Square, History, Undo2, MoreHorizontal, Share2, FileText, FileType2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { format, parseISO } from 'date-fns'
import { PLATFORM_META, STATUS_META } from '@/lib/dummy-data'
import { toast } from 'sonner'
import type { ContentPiece } from '@/lib/types'
import { useSpeechSynthesis } from '@/lib/use-voice'
import { useUsage } from '@/lib/usage'
import { RewriteToolbar, type RewriteVariant } from '@/components/script/rewrite-toolbar'
import { exportScriptAsDoc } from '@/lib/export-docx'
import { GenerateImagesButton } from '@/components/script/generate-images-button'
import { VoiceoverModal } from '@/components/script/voiceover-modal'
import { ProjectAssetsRail } from '@/components/script/project-assets-rail'
import { rememberWorkspace, readLastWorkspace } from '@/lib/last-workspace'
import { extractNarration } from '@/lib/extract-narration'
import { logEvent } from '@/lib/log-event'
import { ProjectActivityTimeline } from '@/components/project/activity-timeline'
import { StoryboardPanel } from '@/components/script/storyboard-panel'

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
  // V2.1 — Voiceover modal + assets rail refresh signal
  const [voiceoverOpen, setVoiceoverOpen] = useState(false)
  const [assetsRefresh, setAssetsRefresh] = useState(0)
  const bumpAssets = () => setAssetsRefresh(k => k + 1)
  // V3.3 — Narration view toggle. Lets the user strip scene headers / descriptions
  // and read ONLY the spoken narration. The Voiceover modal also picks this up.
  const [viewMode, setViewMode] = useState<'full' | 'narration'>('full')

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
    // V3.5 — Creator Memory: log the rewrite for the timeline + Live Pulse.
    logEvent({
      event_type: 'rewrite_applied',
      project_id: piece.id,
      target: piece.title,
      metadata: { variant: variant.replace('_', ' '), original_length: original.length, replacement_length: replacement.length },
    })
    rememberWorkspace(piece.id, piece.title, { stage: 'scripting', last_event: 'rewrite_applied' })
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
    // V3.5 — Creator Memory: track exports for the timeline.
    logEvent({ event_type: 'export_created', project_id: piece.id, target: piece.title, metadata: { format: 'txt' } })
    rememberWorkspace(piece.id, piece.title, { stage: 'exporting', last_event: 'export_created' })
  }

  // Phase V1.5 — DOCX export (Word/Pages-compatible via HTML→.doc trick, no library).
  const exportDocx = () => {
    if (!piece) return
    const body = liveScript || (piece as any).script || piece.description || ''
    exportScriptAsDoc({ title: piece.title, body, isUnlimited })
    toast.success('📄 Exported as Word doc')
    // V3.5 — Creator Memory.
    logEvent({ event_type: 'export_created', project_id: piece.id, target: piece.title, metadata: { format: 'docx' } })
    rememberWorkspace(piece.id, piece.title, { stage: 'exporting', last_event: 'export_created' })
  }

  const genFlow = async () => {
    if (!piece) return
    setFlowLoading(true); setFlowOut(null)
    try {
      const src = (piece as any).script || piece.description || piece.title
      // V3.6 — Send pre-extracted narration so the AI anchors each visual prompt to
      // a real narration beat (Cinematic Sequence Director mode). Falls back gracefully
      // when the script has no extractable narration structure.
      const narrn = src ? extractNarration(src, { keepQuotes: false }) : ''
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'flow_prompts',
          context: {
            script_input: src,
            narration_text: narrn || undefined,
            platform: piece.platform,
            language: 'english',
          },
        }),
      })
      const d = await res.json()
      if (!res.ok || d.error) { toast.error(d.error || 'Flow generation failed'); return }
      setFlowOut(d.output)
      // V3.5 — Creator Memory: log visual-prompt generation for timeline + Live Pulse.
      const sceneCount = (d.output?.scene_prompts || []).length
      logEvent({
        event_type: 'flow_prompts_generated',
        project_id: piece.id,
        target: piece.title,
        metadata: { count: sceneCount, style: d.output?.style_summary || null },
      })
      rememberWorkspace(piece.id, piece.title, { stage: 'visuals', last_event: 'flow_prompts_generated' })
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
    return <RecoveryFlow lostId={params?.id || null} />
  }

  // V3.2 — Remember this workspace so a refresh / new session can recover it.
  // V3.5 — Also log a project_opened event ONCE per project per session so the
  // activity timeline + Live Pulse stay accurate without spamming on every re-render.
  if (piece?.id) {
    rememberWorkspace(piece.id, piece.title)
    if (typeof window !== 'undefined') {
      const key = `mugtee:opened:v1:${piece.id}`
      try {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1')
          logEvent({ event_type: 'project_opened', project_id: piece.id, target: piece.title })
        }
      } catch {}
    }
  }

  const platformMeta = PLATFORM_META[piece.platform]
  const statusMeta   = STATUS_META[piece.status]
  const fullScript   = liveScript || (piece as any).script || piece.description || ''
  // V3.3 — Narration-only version (memo via useMemo not needed; cheap regex pass).
  const narrationOnly = viewMode === 'narration' ? extractNarration(fullScript, { keepQuotes: false }) : ''
  const scriptText   = viewMode === 'narration' ? (narrationOnly || fullScript) : fullScript
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
          {/* V3.3 — Full ↔ Narration toggle. Strips scene headers & descriptions to spoken lines only. */}
          {fullScript && (
            <div className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5 h-9 min-h-[44px] sm:min-h-0" role="tablist" aria-label="Script view mode">
              <button
                onClick={() => setViewMode('full')}
                aria-pressed={viewMode === 'full'}
                className={`px-2.5 h-8 rounded text-[11px] tracking-wide transition ${viewMode === 'full' ? 'bg-gold-500/15 text-gold-200' : 'text-luxe/70 hover:text-luxe'}`}
              >Full</button>
              <button
                onClick={() => setViewMode('narration')}
                aria-pressed={viewMode === 'narration'}
                className={`px-2.5 h-8 rounded text-[11px] tracking-wide transition inline-flex items-center gap-1 ${viewMode === 'narration' ? 'bg-gold-500/15 text-gold-200' : 'text-luxe/70 hover:text-luxe'}`}
                title="Show only the spoken narration (no scene labels)"
              ><Volume2 className="w-3 h-3" /> Narration</button>
            </div>
          )}
          {/* V3.8 — Workspace toolbar consolidated. Generate Voiceover stays primary
              (single click for the most common cinematic step). Edit / TXT / DOC / Copy /
              Pipeline / Share with Crew live under a 3-dot overflow so the toolbar stays
              breathable on mobile. */}
          <Button onClick={() => setVoiceoverOpen(true)} className="h-9 px-3 text-xs bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 gap-1.5 min-h-[44px] sm:min-h-0" title="Generate voiceover from this script">
            <Volume2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Generate Voiceover</span><span className="sm:hidden">Voiceover</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                aria-label="More actions"
                title="More actions"
                className="h-9 w-9 sm:w-auto sm:px-3 text-xs text-luxe/80 hover:text-gold-300 hover:bg-white/5 gap-1.5 min-h-[44px] sm:min-h-0"
              >
                <MoreHorizontal className="w-4 h-4" /><span className="hidden sm:inline">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 glass-strong">
              <DropdownMenuItem onClick={beginEdit}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Continue editing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copy('script', scriptText)}>
                {copied === 'script' ? <Check className="w-3.5 h-3.5 mr-2 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-2" />} Copy script
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportTxt}>
                <FileText className="w-3.5 h-3.5 mr-2" /> Export .txt
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportDocx}>
                <FileType2 className="w-3.5 h-3.5 mr-2" /> Export .doc
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => {
                if (!piece) return
                // V3.8 — "Share with Crew" lightweight: copies the workspace URL with a
                // tracking param so future share-token infrastructure can map view-only
                // access later. No backend, no token table yet — just a clean shareable URL.
                const url = `${window.location.origin}/script/${piece.id}?ref=crew-share`
                try {
                  await navigator.clipboard.writeText(url)
                  toast.success('Crew share link copied')
                } catch {
                  // Fallback for older browsers — prompt with the URL so the creator can copy manually.
                  // (Better than failing silently.)
                  window.prompt('Copy this crew share link:', url)
                }
              }}>
                <Share2 className="w-3.5 h-3.5 mr-2" /> Share with Crew
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/pipeline')} className="text-gold-300 focus:text-gold-200">
                <Plus className="w-3.5 h-3.5 mr-2" /> Open in Pipeline
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Flow prompts panel — V3.6 Cinematic Sequence Director cards */}
      <div className="rounded-2xl glass border border-gold-soft p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center gap-1.5"><Wand2 className="w-3 h-3" /> Cinematic sequence \u00B7 directed by Mugtee</span>
          <div className="flex items-center gap-1.5">
            <Button onClick={genFlow} disabled={flowLoading} className="h-7 px-3 text-[11px] bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 gap-1.5 min-h-[36px]">
              {flowLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} {flowLoading ? 'Generating…' : flowOut ? 'Regenerate' : 'Generate'}
            </Button>
            {/* V3.6 — Image generation now carries Visual Consistency Lock + per-frame direction */}
            {flowOut?.scene_prompts?.length > 0 && (
              <GenerateImagesButton
                projectId={piece.id}
                prompts={flowOut.scene_prompts}
                styleLock={flowOut?.style_summary}
                aspectRatio={piece.platform === 'youtube' ? '16:9' : '9:16'}
                onComplete={bumpAssets}
              />
            )}
          </div>
        </div>
        {flowOut ? (
          <div className="space-y-2.5">
            {flowOut.style_summary && (
              <div className="text-[11px] text-luxe/75 italic flex items-start gap-1.5 px-2.5 py-1.5 rounded-md bg-gold-500/[0.05] border border-gold-500/20">
                <Wand2 className="w-3 h-3 text-gold-400/80 mt-0.5 shrink-0" />
                <span><span className="text-gold-300 not-italic tracking-wider text-[9.5px] uppercase mr-1">Style lock \u00B7</span>{flowOut.style_summary}</span>
              </div>
            )}
            {(flowOut.scene_prompts || []).map((p:any, i:number) => {
              const seq    = p.sequence_index || i + 1
              const tone   = p.emotional_tone || null
              const cam    = p.camera_direction || null
              const dur    = p.duration_seconds || null
              const narrn  = p.narration_line || null
              return (
                <div key={i} className="group relative rounded-xl bg-white/[0.025] border border-white/[0.06] hover:border-gold-500/35 transition p-3">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[9px] tracking-[0.22em] uppercase text-gold-200 bg-gold-500/[0.1] border border-gold-500/25 rounded px-1.5 py-0.5">
                      {String(seq).padStart(2, '0')} \u00B7 {p.type || 'scene'}
                    </span>
                    {tone && (
                      <span className="text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-luxe/70">{tone}</span>
                    )}
                    {dur && (
                      <span className="text-[9.5px] text-muted-foreground inline-flex items-center gap-0.5"><Loader2 className="w-2.5 h-2.5 hidden" />{dur}s</span>
                    )}
                  </div>
                  {narrn && (
                    <p className="text-[12px] text-luxe/85 italic leading-snug mb-1.5">\u201C{narrn}\u201D</p>
                  )}
                  <p className="text-[12.5px] text-luxe/90 leading-snug">{p.prompt}</p>
                  {cam && (
                    <div className="mt-1.5 text-[10.5px] text-muted-foreground inline-flex items-center gap-1">
                      <span className="text-gold-400/70 tracking-wider text-[9.5px] uppercase">Camera</span> \u00B7 {cam}
                    </div>
                  )}
                  <button onClick={() => copy('p'+i, p.prompt)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[10px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 inline-flex items-center gap-1 transition-opacity">
                    {copied === 'p'+i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-[12px] text-muted-foreground italic">Click Generate to assemble 8\u201312 narration-anchored cinematic prompts \u2014 each one mapped to a beat in your script, with camera direction, duration and emotional tone.</div>
        )}
      </div>

      {/* Media attached */}
      {piece.media_url && (
        <div className="rounded-2xl glass border border-gold-soft p-5">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 mb-2 inline-flex items-center gap-1.5"><Film className="w-3 h-3" /> Media attached</span>
          <div className="text-[11px] text-luxe/70 font-mono break-all mt-1">{piece.media_url}</div>
        </div>
      )}

      {/* V2.1 — Project assets rail (Images / Voiceovers / Music / Videos / Prompts / Exports) */}
      <ProjectAssetsRail projectId={piece.id} refreshKey={assetsRefresh} />

      {/* V3.6 — Storyboard \u2014 cinematic horizontal timeline of generated images.
          Reads back from project_assets so it survives refresh / session restart. */}
      <StoryboardPanel projectId={piece.id} refreshKey={assetsRefresh} />

      {/* V3.5 — Creator Memory: cinematic per-project activity timeline. */}
      <ProjectActivityTimeline projectId={piece.id} />

      {/* V2.1 — Voiceover Script Document modal */}
      <VoiceoverModal
        open={voiceoverOpen}
        onOpenChange={setVoiceoverOpen}
        projectId={piece.id}
        /* V3.3 — Prefer the narration-only text when the user is already viewing it,
           else extract narration on the fly so the modal never opens with stage directions. */
        scriptSource={viewMode === 'narration' ? (narrationOnly || fullScript) : extractNarration(fullScript, { keepQuotes: false }) || fullScript}
        scriptTitle={piece.title}
        onCreated={bumpAssets}
      />
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
      onClick={() => {
        // V3.3 — Reliability: hard-cancel any prior utterance before speaking.
        // Browsers (Chrome especially) sometimes leak a paused/zombied queue across pages —
        // forcing cancel() before speak() eliminates the "click does nothing" bug.
        try { window.speechSynthesis?.cancel() } catch {}
        // Defer one tick so cancel propagates before the new utterance is queued.
        setTimeout(() => tts.speak(text), 30)
      }}
      variant="ghost"
      className="h-9 px-3 text-xs text-gold-200 hover:text-gold-100 bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 gap-1.5 min-h-[44px] sm:min-h-0"
      title="Read this script aloud — narrated by Mugtee"
    >
      <Volume2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Read Script</span><span className="sm:hidden">Read</span>
    </Button>
  )
}

// ─── V3.2 RECOVERY FLOW ──────────────────────────────────────────────────────
// When a script id can't be resolved, NEVER dead-end the user. Try:
//   1. The user's most recently opened workspace (localStorage)
//   2. The most recent content_piece in their account (Supabase)
// If either yields a valid project, redirect there with a friendly toast.
// Only when the account has truly no projects do we show a CTA-only screen.
function RecoveryFlow({ lostId }: { lostId: string | null }) {
  const router = useRouter()
  const [phase, setPhase] = useState<'recovering' | 'empty'>('recovering')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Attempt 1 — localStorage last workspace (skip if it's the same lost id).
      const last = readLastWorkspace()
      if (last && last.project_id && last.project_id !== lostId) {
        try {
          const sup = createSupabaseBrowserClient()
          const { data } = await sup.from('content_pieces').select('id').eq('id', last.project_id).is('deleted_at', null).maybeSingle()
          if (!cancelled && data?.id) {
            toast.success('Recovered your latest workspace')
            router.replace(`/script/${data.id}`)
            return
          }
        } catch {}
      }
      // Attempt 2 — most recent content_piece in the user's account.
      try {
        const sup = createSupabaseBrowserClient()
        const { data: { user } } = await sup.auth.getUser()
        if (!user) { router.replace('/login'); return }
        const { data } = await sup.from('content_pieces').select('id, title')
          .eq('user_id', user.id).is('deleted_at', null)
          .order('updated_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
        if (!cancelled && data?.id) {
          toast.success(`Recovered "${data.title || 'latest project'}"`)
          router.replace(`/script/${data.id}`)
          return
        }
      } catch {}
      // Attempt 3 — nothing to recover. Land safely.
      if (!cancelled) setPhase('empty')
    })()
    return () => { cancelled = true }
  }, [lostId, router])

  if (phase === 'recovering') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-6">
        <Loader2 className="w-5 h-5 animate-spin text-gold-300" />
        <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground">Recovering latest workspace…</div>
        <p className="text-[12px] text-luxe/55 max-w-sm">Mugtee never loses your work. Pulling your most recent project.</p>
      </div>
    )
  }

  // Truly empty — show creative entry CTA, not a dead-end.
  return (
    <div className="max-w-xl mx-auto py-16 text-center px-6">
      <Sparkles className="w-5 h-5 text-gold-300 mx-auto mb-3" />
      <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 mb-2">Studio empty</div>
      <h1 className="font-display text-3xl mb-3">Your studio is ready.</h1>
      <p className="text-luxe/65 text-sm mb-6 max-w-sm mx-auto">Generate your first script from the dashboard — every production lands here automatically.</p>
      <Button onClick={() => router.push('/dashboard')} className="bg-gold-gradient text-black gap-2 shadow-gold-glow">
        <Sparkles className="w-4 h-4" /> Open Mugtee AI Studio
      </Button>
    </div>
  )
}

