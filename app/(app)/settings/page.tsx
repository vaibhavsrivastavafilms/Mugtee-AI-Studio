'use client'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Upload, Image as ImageIcon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { workspace, userId, updateWorkspace } = useStore()
  const [name, setName] = useState(workspace.name || '')
  const [logoUrl, setLogoUrl] = useState(workspace.logo_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseBrowserClient()

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
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseKey,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
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
    await updateWorkspace({ name: name.trim() || 'My Studio', logo_url: logoUrl || null })
    setSaving(false)
    toast.success('Studio settings saved')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
        <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Studio Settings</div>
        <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">Your</span> workspace</h1>
        <p className="text-luxe/70 mt-2">Personalize how your studio appears.</p>
      </motion.div>

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
              {logoUrl ? (
                <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gold-400/60" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleLogoFile(e.target.files[0])}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()} className="gap-2 border-gold-500/30">
                  <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : (logoUrl ? 'Change logo' : 'Upload logo')}
                </Button>
                {logoUrl && (
                  <Button variant="ghost" onClick={() => setLogoUrl('')} className="text-muted-foreground">Remove</Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG, or WebP. Max 5MB.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="bg-gold-gradient text-black gap-2 shadow-gold-glow">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
