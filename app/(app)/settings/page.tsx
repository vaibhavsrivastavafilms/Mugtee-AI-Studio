'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { NICHES, AUDIENCES, readCreatorProfile, writeCreatorProfile } from '@/components/ai/viral-studio-panel'
import { Save, Upload, Image as ImageIcon, Trash2, RotateCcw, Palette, RefreshCw, Archive, Plug, Instagram, Unplug, AlertCircle, CheckCircle2, Crown, ArrowRight, Sparkles } from 'lucide-react'
import { useStore, type TrashItem } from '@/lib/store'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirm } from '@/components/ui/confirm'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, parseISO } from 'date-fns'

const THEMES = [
  { key: 'gold',     label: 'Gold',          hue: 43,  sat: 60, css: 'linear-gradient(135deg, hsl(43 60% 70%), hsl(43 60% 50%), hsl(43 60% 30%))' },
  { key: 'crimson',  label: 'Crimson',       hue: 0,   sat: 70, css: 'linear-gradient(135deg, hsl(0 70% 65%), hsl(0 70% 50%), hsl(0 70% 32%))' },
  { key: 'emerald',  label: 'Emerald',       hue: 152, sat: 55, css: 'linear-gradient(135deg, hsl(152 55% 65%), hsl(152 55% 45%), hsl(152 55% 28%))' },
  { key: 'sapphire', label: 'Sapphire',      hue: 215, sat: 70, css: 'linear-gradient(135deg, hsl(215 70% 70%), hsl(215 70% 50%), hsl(215 70% 32%))' },
  { key: 'minimal',  label: 'Minimal White', hue: 0,   sat: 0,  css: 'linear-gradient(135deg, hsl(0 0% 90%), hsl(0 0% 65%), hsl(0 0% 40%))' },
]

export default function SettingsPage() {
  const { workspace, userId, updateWorkspace, restoreDefaults, loadTrash, restoreFromTrash, permanentlyDelete, clearTrash } = useStore()
  const confirm = useConfirm()
  const [name, setName] = useState(workspace.name || '')
  const [logoUrl, setLogoUrl] = useState(workspace.logo_url || '')
  const [theme, setTheme] = useState(workspace.theme || 'gold')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseBrowserClient()

  // Trash state
  const [trash, setTrash] = useState<TrashItem[]>([])
  const [trashLoading, setTrashLoading] = useState(false)

  // Phase 8: Instagram integration state (inline, no helper component)
  const [igAccount, setIgAccount] = useState<any>(null)
  const [igLoading, setIgLoading] = useState(true)
  const [igHint, setIgHint] = useState<{ ok: boolean; msg: string } | null>(null)

  const loadIg = async () => {
    setIgLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIgAccount(null); return }
      const { data } = await supabase.from('instagram_accounts').select('username, ig_business_id, page_id, connected_at, expires_at').eq('user_id', user.id).maybeSingle()
      setIgAccount(data || null)
    } catch { setIgAccount(null) }
    finally { setIgLoading(false) }
  }

  useEffect(() => {
    loadIg()
    try {
      const sp = new URLSearchParams(window.location.search)
      const ig = sp.get('ig'); const msg = sp.get('msg')
      if (ig === 'connected') { setIgHint({ ok: true, msg: msg || 'Instagram connected.' }); toast.success('Instagram connected'); window.history.replaceState({}, '', '/settings') }
      else if (ig === 'error') { setIgHint({ ok: false, msg: msg || 'Connection failed.' }); toast.error('Instagram connection failed'); window.history.replaceState({}, '', '/settings') }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let channel: any
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        channel = supabase.channel(`ig-acct-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'instagram_accounts', filter: `user_id=eq.${user.id}` }, () => loadIg()).subscribe()
      } catch {}
    })()
    return () => { if (channel) supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const igConnect = () => { window.location.href = '/api/instagram/connect' }
  const igDisconnect = async () => {
    if (!await confirm({ title: 'Disconnect Instagram?', description: 'You will need to reconnect before scheduled posts can publish.', destructive: true })) return
    try { await fetch('/api/instagram/disconnect') } catch {}
    setIgAccount(null); toast.success('Instagram disconnected')
  }

  const igExpiresMs = (() => { try { return igAccount?.expires_at ? new Date(igAccount.expires_at).getTime() : null } catch { return null } })()
  const igTokenExpiring = igExpiresMs !== null && igExpiresMs - Date.now() < 7 * 24 * 60 * 60 * 1000
  const igTokenExpired  = igExpiresMs !== null && igExpiresMs < Date.now()
  const igExpiresLabel  = (() => { try { return igAccount?.expires_at ? formatDistanceToNow(parseISO(igAccount.expires_at), { addSuffix: true }) : null } catch { return null } })()

  // Phase 6F: Creator profile (niche + audience) — default AI context for TT Viral. Stored in localStorage.
  const [profile, setProfile] = useState<{ niche: string; audience: string }>({ niche: 'restaurant', audience: 'mass' })
  useEffect(() => { setProfile(readCreatorProfile()) }, [])
  const updateProfile = (patch: { niche?: string; audience?: string }) => {
    const next = { ...profile, ...patch }
    setProfile(next)
    writeCreatorProfile(patch)
    toast.success('Creator profile updated')
  }

  // Keep local form in sync with workspace updates from realtime
  useEffect(() => {
    setName(workspace.name || '')
    setLogoUrl(workspace.logo_url || '')
    setTheme(workspace.theme || 'gold')
  }, [workspace.name, workspace.logo_url, workspace.theme])

  const refreshTrash = async () => {
    setTrashLoading(true)
    try { setTrash(await loadTrash()) } finally { setTrashLoading(false) }
  }
  useEffect(() => { refreshTrash() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogoFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo too large (5MB max)'); return }
    if (!['image/png','image/jpeg','image/svg+xml','image/webp'].includes(file.type)) { toast.error('Use PNG / JPG / SVG / WebP'); return }
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const ext = file.name.split('.').pop() || 'png'
      const path = `${userId}/logo_${Date.now()}.${ext}`
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const res = await fetch(`${supabaseUrl}/storage/v1/object/media/${path}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': supabaseKey, 'Content-Type': file.type, 'x-upsert': 'true' },
        body: file,
      })
      if (!res.ok) throw new Error('Upload failed')
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
      setLogoUrl(pub.publicUrl)
      toast.success('Logo uploaded')
    } catch (e: any) {
      toast.error(e?.message || 'Could not upload logo')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await updateWorkspace({ name: name.trim() || 'My Studio', logo_url: logoUrl || null, theme })
    setSaving(false)
    toast.success('Studio settings saved')
  }

  const handleRestoreDefaults = async () => {
    if (await confirm({ title: 'Restore defaults?', description: 'Studio name, logo and theme will be reset.', destructive: true, confirmText: 'Restore' })) {
      await restoreDefaults()
      toast.success('Defaults restored')
    }
  }

  const handleClearTrash = async () => {
    if (await confirm({ title: 'Clear all trash?', description: 'This permanently deletes every item in your trash. Cannot be undone.', destructive: true, confirmText: 'Clear trash' })) {
      await clearTrash()
      toast.success('Trash cleared')
      refreshTrash()
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Studio Settings</div>
        <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">Your</span> workspace</h1>
        <p className="text-luxe/70 mt-2">Personalize how your studio appears.</p>
      </motion.div>

      {/* Identity ============================================================== */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.05}}
        className="glass rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-2">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Studio name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="My Studio" className="bg-white/[0.03] h-12 text-lg font-display" />
          <p className="text-xs text-muted-foreground">Shown in the sidebar and across your studio.</p>
        </div>

        <div className="gold-divider" />

        <div className="space-y-3">
          <label className="text-xs tracking-wider uppercase text-muted-foreground">Logo</label>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-xl glass flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-gold-400/60" />}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleLogoFile(e.target.files[0])} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()} className="gap-2 border-gold-500/30">
                  <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : (logoUrl ? 'Change logo' : 'Upload logo')}
                </Button>
                {logoUrl && <Button variant="ghost" onClick={() => setLogoUrl('')} className="text-muted-foreground">Remove</Button>}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG, or WebP. Max 5MB.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <Button variant="ghost" onClick={handleRestoreDefaults} className="gap-2 text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3.5 h-3.5" /> Restore defaults
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gold-gradient text-black gap-2 shadow-gold-glow">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </motion.div>

      {/* Creator Profile (Phase 6F) ====================================== */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.09}}
        className="glass rounded-2xl p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-gold-400" />
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">Creator Profile</div>
        </div>
        <h2 className="font-display text-2xl mb-1">AI scripting voice</h2>
        <p className="text-luxe/70 text-sm mb-5">ViralForge AI adapts hooks, scripts, and ideas to your niche and audience automatically. Change anytime.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-wider uppercase text-muted-foreground">Niche</label>
            <Select value={profile.niche} onValueChange={(v) => updateProfile({ niche: v })}>
              <SelectTrigger className="bg-white/[0.03] h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NICHES.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] tracking-wider uppercase text-muted-foreground">Audience</label>
            <Select value={profile.audience} onValueChange={(v) => updateProfile({ audience: v })}>
              <SelectTrigger className="bg-white/[0.03] h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCES.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-[10px] tracking-widest uppercase text-muted-foreground mt-4">Saved on this device · synced into every ViralForge generation</p>
      </motion.div>

      {/* Theme ================================================================= */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
        className="glass rounded-2xl p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-gold-400" />
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">Accent Theme</div>
        </div>
        <h2 className="font-display text-2xl mb-1">Studio mood</h2>
        <p className="text-luxe/70 text-sm mb-5">Switch the entire palette live. Saves on click.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {THEMES.map(t => {
            const active = theme === t.key
            return (
              <button key={t.key}
                onClick={async () => { setTheme(t.key); await updateWorkspace({ theme: t.key }) }}
                className={cn('group relative rounded-xl border p-3 text-left transition hover:bg-white/[0.03]',
                  active ? 'border-gold-500/60 bg-gold-500/10' : 'border-white/[0.06]')}
              >
                <div className="h-14 w-full rounded-lg mb-2" style={{ background: t.css }} />
                <div className="text-xs font-medium tracking-wide">{t.label}</div>
                {active && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold-300 shadow-gold-glow" />}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Integrations ========================================================== */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.13}}
        className="glass rounded-2xl p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <Plug className="w-4 h-4 text-gold-400" />
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">Integrations</div>
        </div>
        <h2 className="font-display text-2xl mb-1">Publishing platforms</h2>
        <p className="text-luxe/70 text-sm mb-5">Connect a Professional Instagram account linked to a Facebook Page to enable real auto-publishing from the queue.</p>

        {igHint && (
          <div className={cn('mb-4 flex items-start gap-2 p-3 rounded-lg text-xs', igHint.ok ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30' : 'bg-red-500/10 text-red-200 border border-red-500/30')}>
            {igHint.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{igHint.msg}</span>
          </div>
        )}

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/30 via-rose-500/30 to-amber-500/30 ring-1 ring-white/[0.08] flex items-center justify-center shrink-0">
            <Instagram className="w-6 h-6 text-rose-200" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium">Instagram</div>
              {igLoading ? null : igAccount ? (
                <span className={cn('text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full',
                  igTokenExpired ? 'bg-red-500/15 text-red-300' :
                  igTokenExpiring ? 'bg-amber-500/15 text-amber-300' :
                  'bg-emerald-500/15 text-emerald-300')}>
                  {igTokenExpired ? 'token expired' : igTokenExpiring ? 'token expiring' : 'connected'}
                </span>
              ) : (
                <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-300">not connected</span>
              )}
            </div>
            {igAccount ? (
              <div className="text-xs text-muted-foreground mt-1 leading-snug">
                {igAccount.username ? <span>@{igAccount.username} · </span> : null}
                IG ID {String(igAccount.ig_business_id || '').slice(0, 8)}…
                {igExpiresLabel && <> · token expires {igExpiresLabel}</>}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-1 leading-snug">
                Requires a Professional Instagram account linked to a Facebook Page you admin.
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {igAccount ? (
              <>
                <Button onClick={igConnect} variant="ghost" className="text-gold-300 hover:text-gold-200 hover:bg-gold-500/10 gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                </Button>
                <Button onClick={igDisconnect} variant="ghost" className="text-muted-foreground hover:text-red-300 hover:bg-red-500/10 gap-1.5">
                  <Unplug className="w-3.5 h-3.5" /> Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={igConnect} className="bg-gold-gradient text-black gap-1.5">
                <Plug className="w-3.5 h-3.5" /> Connect Instagram
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Billing (placeholder) =========================================== */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.14}}
        className="glass rounded-2xl p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-4 h-4 text-gold-400" />
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">Billing</div>
        </div>
        <h2 className="font-display text-2xl mb-1">Your plan</h2>
        <p className="text-luxe/70 text-sm mb-5">Manage your subscription and seats.</p>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-gold-gradient text-black flex items-center justify-center shrink-0 shadow-gold-glow">
            <Crown className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium">Single Creator</div>
              <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">active</span>
              <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-white/[0.04] text-luxe/70">free preview</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1 leading-snug">
              ₹245/month · 1 workspace · 2 devices · AI scripting + viral engine included
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/pricing">
              <Button className="bg-gold-gradient text-black gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" /> Upgrade plan
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Trash ================================================================= */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.15}}
        className="glass rounded-2xl p-6 sm:p-8"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-gold-400" />
            <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80">Trash</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refreshTrash} disabled={trashLoading} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <RefreshCw className={cn('w-3.5 h-3.5', trashLoading && 'animate-spin')} /> Refresh
            </Button>
            {trash.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearTrash} className="gap-1.5 text-red-300 hover:text-red-200 hover:bg-red-500/10">
                <Trash2 className="w-3.5 h-3.5" /> Clear all
              </Button>
            )}
          </div>
        </div>
        <h2 className="font-display text-2xl mb-1">Deleted items</h2>
        <p className="text-luxe/70 text-sm mb-5">Restore anything by mistake, or permanently remove forever.</p>

        {trashLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
        ) : trash.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Trash is empty.</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-luxe pr-1">
            {trash.map(t => (
              <div key={t.table + ':' + t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span className="uppercase tracking-wider">{t.table.replace('_pieces','')}</span>
                    <span>• deleted {formatDistanceToNow(parseISO(t.deleted_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost"
                  onClick={async () => { await restoreFromTrash(t.table, t.id); refreshTrash() }}
                  className="gap-1.5 text-gold-300 hover:text-gold-200 hover:bg-gold-500/10">
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={async () => {
                    if (await confirm({ title: `Delete "${t.title}" forever?`, description: 'This cannot be undone.', destructive: true })) {
                      await permanentlyDelete(t.table, t.id); refreshTrash()
                    }
                  }}
                  className="gap-1.5 text-red-300 hover:text-red-200 hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

