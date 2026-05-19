'use client'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Upload, Image as ImageIcon, Trash2, RotateCcw, Palette, RefreshCw, Archive } from 'lucide-react'
import { useStore, type TrashItem } from '@/lib/store'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
